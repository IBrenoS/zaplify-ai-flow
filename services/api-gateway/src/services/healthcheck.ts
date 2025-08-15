import fetch from 'node-fetch';

import { config, configHelpers } from '../config/env.js';
import type { HealthStatus } from '../types/index.js';
import { logger } from '../utils/index.js';

interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
}

export class HealthCheckService {
  private services: ServiceConfig[] = [
    { name: 'ia', url: config.services.AI_SERVICE_URL },
    { name: 'whatsapp', url: config.services.WHATSAPP_SERVICE_URL },
    { name: 'funnel', url: config.services.FUNNEL_ENGINE_URL },
    { name: 'analytics', url: config.services.ANALYTICS_SERVICE_URL }
  ];

  /**
   * Generate mock health status for a service
   */
  private generateMockHealthStatus(serviceName: string): HealthStatus {
    // Predefined mock scenarios for different services
    const mockScenarios: Record<string, { ok: boolean; error?: string }> = {
      ia: { ok: true },
      whatsapp: { ok: false, error: 'Connection timeout (mock)' },
      funnel: { ok: true },
      analytics: { ok: true }
    };

    const scenario = mockScenarios[serviceName] || { ok: true };

    // Generate random response time between 10-200ms for realistic mock
    const responseTime = Math.floor(Math.random() * 190) + 10;

    return {
      ok: scenario.ok,
      service: serviceName,
      responseTime,
      mode: 'mock',
      ...(scenario.error && { error: scenario.error })
    };
  }

  async checkService(
    config: ServiceConfig,
    correlationId: string,
    tenantId: string,
    timeout: number = 5000
  ): Promise<HealthStatus> {
    // Check if mock mode is enabled
    if (configHelpers.isHealthMockEnabled()) {
      logger.debug(
        `Health check using mock mode for ${config.name}`,
        tenantId,
        correlationId,
        { service: config.name, mode: 'mock' }
      );

      return this.generateMockHealthStatus(config.name);
    }

    // Real health check implementation
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${config.url}/health`, {
        method: 'GET',
        headers: {
          'x-correlation-id': correlationId,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        logger.debug(
          `Health check success for ${config.name}`,
          tenantId,
          correlationId,
          { service: config.name, responseTime, status: response.status, mode: 'real' }
        );

        return {
          ok: true,
          service: config.name,
          responseTime,
          mode: 'real'
        };
      } else {
        logger.warn(
          `Health check failed for ${config.name}`,
          tenantId,
          correlationId,
          { service: config.name, responseTime, status: response.status, mode: 'real' }
        );

        return {
          ok: false,
          service: config.name,
          error: `HTTP ${response.status}`,
          responseTime,
          mode: 'real'
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        `Health check error for ${config.name}`,
        tenantId,
        correlationId,
        { service: config.name, error: errorMessage, responseTime, mode: 'real' }
      );

      return {
        ok: false,
        service: config.name,
        error: errorMessage,
        responseTime,
        mode: 'real'
      };
    }
  }

  async checkAllServices(correlationId: string, tenantId: string): Promise<{
    ia: HealthStatus;
    whatsapp: HealthStatus;
    funnel: HealthStatus;
    analytics: HealthStatus;
  }> {
    const mode = configHelpers.isHealthMockEnabled() ? 'mock' : 'real';

    logger.info(
      `Starting deep health check for all services (${mode} mode)`,
      tenantId,
      correlationId,
      { mode }
    );

    const checks = await Promise.all(
      this.services.map(service => this.checkService(service, correlationId, tenantId, config.services.SERVICE_TIMEOUT_MS))
    );

    const result = {
      ia: checks.find(c => c.service === 'ia')!,
      whatsapp: checks.find(c => c.service === 'whatsapp')!,
      funnel: checks.find(c => c.service === 'funnel')!,
      analytics: checks.find(c => c.service === 'analytics')!
    };

    const failedServices = Object.values(result).filter(status => !status.ok);

    if (failedServices.length > 0) {
      logger.warn(
        `Deep health check completed with ${failedServices.length} failures (${mode} mode)`,
        tenantId,
        correlationId,
        {
          failedServices: failedServices.map(s => s.service),
          mode,
          totalServices: this.services.length,
          failureRate: `${failedServices.length}/${this.services.length}`
        }
      );
    } else {
      logger.info(
        `Deep health check completed successfully - all services healthy (${mode} mode)`,
        tenantId,
        correlationId,
        { mode, totalServices: this.services.length }
      );
    }

    return result;
  }
}

export const healthCheckService = new HealthCheckService();
