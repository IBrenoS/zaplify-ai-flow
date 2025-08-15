import fetch, { Response } from 'node-fetch';

import { logger } from '../utils/index.js';

interface ProxyResponse {
  status: number;
  data?: any;
  error?: string;
  ok: boolean;
  tenant_id?: string;
  correlation_id?: string;
  responseTime: number;
  success?: boolean;
}

export class ProxyService {
  /**
   * Executa uma requisição de proxy para um serviço downstream
   */
  static async proxyRequest(options: {
    method: string;
    url: string;
    body?: any;
    headers: Record<string, string>;
    tenantId: string;
    correlationId: string;
    config?: {
      timeout?: number;
      propagateHeaders?: string[];
    };
  }): Promise<ProxyResponse> {
    const { method, url, body, headers, tenantId, correlationId, config = {} } = options;
    const timeout = config.timeout || 5000;
    const startTime = Date.now();

    logger.info('Proxy request initiated', tenantId, correlationId, {
      method,
      url,
      hasBody: !!body,
      timeout
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const preparedHeaders = ProxyService.prepareHeaders(headers, tenantId, correlationId);
      const requestBody = body ? JSON.stringify(body) : undefined;

      const response = await fetch(url, {
        method,
        headers: preparedHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await ProxyService.parseResponse(response);
      const responseTime = Date.now() - startTime;

      logger.info('Proxy request completed', tenantId, correlationId, {
        method,
        url,
        status: result.status,
        success: response.ok,
        responseTime
      });

      return {
        ...result,
        responseTime,
        success: response.ok
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Proxy request failed', tenantId, correlationId, {
        method,
        url,
        error: error instanceof Error ? error.message : String(error),
        responseTime
      });

      return {
        status: 502,
        error: `Downstream service error: ${error instanceof Error ? error.message : String(error)}`,
        ok: false,
        tenant_id: tenantId,
        correlation_id: correlationId,
        responseTime,
        success: false
      };
    }
  }

  /**
   * Prepara headers para propagação
   */
  static prepareHeaders(originalHeaders: Record<string, string> = {}, tenantId?: string, correlationId?: string): Record<string, string> {
    const headersToPropagate = [
      'x-correlation-id',
      'x-tenant-id',
      'authorization',
      'content-type'
    ];

    const headers: Record<string, string> = {};

    // Propaga headers específicos
    headersToPropagate.forEach(headerName => {
      const value = originalHeaders[headerName] || originalHeaders[headerName.toLowerCase()];
      if (value) {
        headers[headerName.toLowerCase()] = value;
      }
    });

    // Adiciona tenant_id e correlation_id se não existirem
    if (tenantId && !headers['x-tenant-id']) {
      headers['x-tenant-id'] = tenantId;
    }

    if (correlationId && !headers['x-correlation-id']) {
      headers['x-correlation-id'] = correlationId;
    }

    // Se não tem content-type, adiciona padrão para JSON
    if (!headers['content-type'] && originalHeaders['content-type'] !== '') {
      headers['content-type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Parse da resposta do downstream
   */
  static async parseResponse(response: Response): Promise<Omit<ProxyResponse, 'responseTime' | 'success'>> {
    try {
      const contentType = response.headers.get('content-type') || '';

      let data: any;
      if (contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        data,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: response.status,
        data: null,
        error: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
        ok: false
      };
    }
  }

  /**
   * Cria resposta de sucesso padronizada para routes
   */
  static createSuccessResponse(
    data: any,
    correlationId: string,
    tenantId: string,
    responseTime: number,
    status: number = 200
  ): { data: ProxyResponse } {
    return {
      data: {
        status,
        data,
        ok: true,
        tenant_id: tenantId,
        correlation_id: correlationId,
        responseTime,
        success: true
      }
    };
  }

  /**
   * Cria resposta de erro 502 padronizada para routes
   */
  static createBadGatewayResponse(
    errorMessage: string,
    correlationId: string,
    tenantId: string,
    responseTime: number
  ): { data: ProxyResponse } {
    return {
      data: {
        status: 502,
        error: errorMessage,
        ok: false,
        tenant_id: tenantId,
        correlation_id: correlationId,
        responseTime,
        success: false
      }
    };
  }
}
