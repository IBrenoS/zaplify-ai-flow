import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

// Evolution API endpoints constants
const EVOLUTION_ENDPOINTS = {
  START_SESSION: '/instance/create',
  QR_CODE: '/instance/connect',
  STATUS: '/instance/connectionState',
  SEND_TEXT: '/message/sendText',
  SEND_MEDIA: '/message/sendMedia',
} as const;

interface EvolutionResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface SessionStatus {
  instance: {
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
  };
}

interface QRCodeResponse {
  qrcode?: {
    code?: string;
    base64?: string;
  };
  instance?: {
    instanceName: string;
    status: string;
  };
}

interface StartSessionResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  qrcode?: {
    code?: string;
    base64?: string;
  };
}

interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    messageId: string;
  };
}

interface SendMediaResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    messageId: string;
  };
}

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

interface EvolutionErrorResponse {
  message?: string;
  error?: string;
}

export class EvolutionClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.EVOLUTION_BASE_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.EVOLUTION_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({
          msg: 'Evolution API request',
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error({
          msg: 'Evolution API request error',
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          msg: 'Evolution API response',
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as RetryConfig;

        // Retry logic for 5xx errors
        if (error.response?.status && error.response.status >= 500 && config) {
          const retryCount = config.__retryCount || 0;
          const maxRetries = 3;

          if (retryCount < maxRetries) {
            config.__retryCount = retryCount + 1;

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, retryCount) * 1000;

            logger.warn({
              msg: 'Evolution API retry attempt',
              attempt: retryCount + 1,
              maxRetries,
              delay,
              status: error.response?.status,
              url: config.url,
            });

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
          }
        }

        logger.error({
          msg: 'Evolution API error',
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          error: error.message,
          responseData: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  private buildEndpointUrl(endpoint: string, sessionId: string): string {
    // TODO: Alinhar URLs conforme documentação da Evolution API
    // Atualmente assumindo padrão: /endpoint/sessionId
    return `${endpoint}/${sessionId}`;
  }

  private handleEvolutionError(error: AxiosError, operation: string): never {
    const status = error.response?.status || 500;
    const errorData = error.response?.data as EvolutionErrorResponse | undefined;
    const message = errorData?.message || errorData?.error || error.message;

    throw new ExternalServiceError(
      `Evolution API ${operation} failed: ${message}`,
      String(status)
    );
  }

  async startSession(sessionId: string): Promise<StartSessionResponse> {
    try {
      const url = this.buildEndpointUrl(EVOLUTION_ENDPOINTS.START_SESSION, sessionId);

      const response = await this.client.post<EvolutionResponse<StartSessionResponse>>(url, {
        instanceName: sessionId,
        token: config.EVOLUTION_API_KEY,
      });

      logger.info({
        msg: 'Session started successfully',
        sessionId,
        status: response.data.data?.instance?.status,
      });

      return response.data.data || {
        instance: {
          instanceName: sessionId,
          status: 'created',
        },
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to start session',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.handleEvolutionError(error as AxiosError, 'startSession');
    }
  }

  async getQRCode(sessionId: string): Promise<QRCodeResponse> {
    try {
      const url = this.buildEndpointUrl(EVOLUTION_ENDPOINTS.QR_CODE, sessionId);

      const response = await this.client.get<EvolutionResponse<QRCodeResponse>>(url);

      logger.info({
        msg: 'QR Code retrieved successfully',
        sessionId,
        hasQRCode: !!response.data.data?.qrcode?.base64,
      });

      return response.data.data || {
        instance: {
          instanceName: sessionId,
          status: 'disconnected',
        },
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to get QR Code',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.handleEvolutionError(error as AxiosError, 'getQRCode');
    }
  }

  async getStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const url = this.buildEndpointUrl(EVOLUTION_ENDPOINTS.STATUS, sessionId);

      const response = await this.client.get<EvolutionResponse<SessionStatus>>(url);

      logger.info({
        msg: 'Session status retrieved successfully',
        sessionId,
        status: response.data.data?.instance?.status,
      });

      return response.data.data || {
        instance: {
          instanceName: sessionId,
          status: 'close',
        },
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to get session status',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.handleEvolutionError(error as AxiosError, 'getStatus');
    }
  }

  async sendText(sessionId: string, to: string, text: string): Promise<SendTextResponse> {
    try {
      const url = this.buildEndpointUrl(EVOLUTION_ENDPOINTS.SEND_TEXT, sessionId);

      const payload = {
        number: to,
        text: text,
      };

      const response = await this.client.post<EvolutionResponse<SendTextResponse>>(url, payload);

      logger.info({
        msg: 'Text message sent successfully',
        sessionId,
        to,
        messageId: response.data.data?.key?.id,
      });

      return response.data.data || {
        key: {
          remoteJid: to,
          fromMe: true,
          id: 'unknown',
        },
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to send text message',
        sessionId,
        to,
        error: error instanceof Error ? error.message : String(error),
      });

      this.handleEvolutionError(error as AxiosError, 'sendText');
    }
  }

  async sendMedia(sessionId: string, to: string, mediaUrl: string, caption?: string): Promise<SendMediaResponse> {
    try {
      const url = this.buildEndpointUrl(EVOLUTION_ENDPOINTS.SEND_MEDIA, sessionId);

      const payload = {
        number: to,
        mediatype: 'image', // TODO: detect media type from URL/extension
        media: mediaUrl,
        caption: caption || '',
      };

      const response = await this.client.post<EvolutionResponse<SendMediaResponse>>(url, payload);

      logger.info({
        msg: 'Media message sent successfully',
        sessionId,
        to,
        mediaUrl,
        messageId: response.data.data?.key?.id,
      });

      return response.data.data || {
        key: {
          remoteJid: to,
          fromMe: true,
          id: 'unknown',
        },
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to send media message',
        sessionId,
        to,
        mediaUrl,
        error: error instanceof Error ? error.message : String(error),
      });

      this.handleEvolutionError(error as AxiosError, 'sendMedia');
    }
  }
}

// Singleton instance
export const evolutionClient = new EvolutionClient();
