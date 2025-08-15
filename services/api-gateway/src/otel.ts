/**
 * OpenTelemetry Instrumentation for API Gateway
 *
 * Este arquivo configura o rastreamento distribuído usando OpenTelemetry.
 * Deve ser importado ANTES de qualquer outro módulo para garantir que
 * as instrumentações sejam aplicadas corretamente.
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  defaultResource,
  resourceFromAttributes
} from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

// Configurar apenas se OTEL_EXPORTER_OTLP_ENDPOINT estiver definido
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (otlpEndpoint) {
  console.log('[OTEL] Initializing OpenTelemetry with endpoint:', otlpEndpoint);

  try {
    // Configurar o exportador de traces
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: {
        // Adicionar headers customizados se necessário
        'Content-Type': 'application/json',
      },
    });

    // Configurar resource com informações do serviço
    const serviceResource = defaultResource().merge(
      resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: 'api-gateway',
        [SEMRESATTRS_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        // Adicionar informações do ambiente
        environment: process.env.NODE_ENV || 'development',
        'tenant.id': 'system', // Identificador do tenant para filtros
      })
    );

    // Configurar o SDK Node.js
    const sdk = new NodeSDK({
      resource: serviceResource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Configurar instrumentações específicas
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Adicionar informações customizadas ao span HTTP
              // Type guard para verificar se é IncomingMessage
              if ('headers' in request && request.headers) {
                span.setAttributes({
                  'http.user_agent': String(request.headers['user-agent'] || 'unknown'),
                  'http.x_correlation_id': String(request.headers['x-correlation-id'] || 'none'),
                  'http.x_tenant_id': String(request.headers['x-tenant-id'] || 'default'),
                });
              }
            },
            responseHook: (span, response) => {
              // Adicionar informações da resposta com type guard
              const statusCode = 'statusCode' in response ? response.statusCode : undefined;
              if (statusCode && statusCode >= 400) {
                span.recordException({
                  name: 'HTTP Error',
                  message: `HTTP ${statusCode}`,
                });
              }
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
            requestHook: (span, info) => {
              // Adicionar informações específicas do Express com type guards
              const route = (info as any)?.route;
              const request = (info as any)?.request;

              span.setAttributes({
                'express.route': route?.path ? String(route.path) : 'unknown',
                'express.method': request?.method ? String(request.method) : 'unknown',
              });
            },
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Desabilitar FS para reduzir ruído
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false, // Desabilitar DNS para reduzir ruído
          },
        }),
      ],
    });

    // Inicializar o SDK
    sdk.start();

    console.log('[OTEL] OpenTelemetry instrumentation started successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('[OTEL] OpenTelemetry terminated'))
        .catch((error) => console.error('[OTEL] Error terminating OpenTelemetry:', error))
        .finally(() => process.exit(0));
    });

  } catch (error) {
    console.error('[OTEL] Failed to initialize OpenTelemetry:', error);
    // Não quebrar a aplicação se OTEL falhar
  }
} else {
  console.log('[OTEL] OpenTelemetry disabled - OTEL_EXPORTER_OTLP_ENDPOINT not set');
}

export { };
