import swaggerJSDoc from 'swagger-jsdoc';

import { logger } from '../utils/index.js';

/**
 * Configuração do Swagger/OpenAPI para o API Gateway
 * Documentação apenas das rotas do gateway (não agrega specs de outros serviços)
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Zaplify AI Flow - API Gateway',
    version: '1.0.0',
    description: `
      **API Gateway para Zaplify AI Flow**

      Este gateway centraliza o acesso aos microserviços de IA, WhatsApp, Funnel e Analytics.

      **Recursos Principais:**
      - 🔐 Autenticação JWT com sistema hierárquico de escopos
      - ⚡ Rate limiting global e por tenant
      - 🔗 Proxy routes com propagação automática de headers
      - 🌐 WebSocket Gateway para comunicação real-time
      - 📊 Health check agregado de todos os serviços

      **Headers Globais:**
      - \`x-correlation-id\`: ID de correlação para rastreamento
      - \`x-tenant-id\`: Identificação do tenant
      - \`Authorization\`: Token JWT Bearer para autenticação
    `,
    contact: {
      name: 'Zaplify AI Flow Team',
      email: 'dev@zaplify.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Development Server'
    },
    {
      url: 'https://api.zaplify.com',
      description: 'Production Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token obtido através do serviço de autenticação'
      }
    },
    parameters: {
      correlationId: {
        name: 'x-correlation-id',
        in: 'header',
        description: 'ID único para rastreamento da requisição através dos serviços',
        required: false,
        schema: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        }
      },
      tenantId: {
        name: 'x-tenant-id',
        in: 'header',
        description: 'Identificador do tenant para isolamento de dados',
        required: false,
        schema: {
          type: 'string',
          example: 'acme-corp'
        }
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['ok', 'error', 'timestamp'],
        properties: {
          ok: {
            type: 'boolean',
            example: false,
            description: 'Indica se a operação foi bem-sucedida'
          },
          error: {
            type: 'string',
            example: 'Downstream service error',
            description: 'Mensagem de erro'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-08-11T23:00:00.000Z',
            description: 'Timestamp do erro'
          },
          correlation_id: {
            type: 'string',
            format: 'uuid',
            example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            description: 'ID de correlação da requisição'
          },
          tenant_id: {
            type: 'string',
            example: 'acme-corp',
            description: 'ID do tenant'
          }
        }
      },
      HealthCheck: {
        type: 'object',
        required: ['ok', 'service', 'timestamp'],
        properties: {
          ok: {
            type: 'boolean',
            example: true,
            description: 'Status geral do gateway'
          },
          service: {
            type: 'string',
            example: 'api-gateway',
            description: 'Nome do serviço'
          },
          deps: {
            type: 'object',
            description: 'Status dos serviços dependentes',
            properties: {
              ia: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', example: true },
                  service: { type: 'string', example: 'ia' },
                  responseTime: { type: 'number', example: 45 }
                }
              },
              whatsapp: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', example: true },
                  service: { type: 'string', example: 'whatsapp' },
                  responseTime: { type: 'number', example: 67 }
                }
              },
              funnel: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', example: true },
                  service: { type: 'string', example: 'funnel' },
                  responseTime: { type: 'number', example: 89 }
                }
              },
              analytics: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', example: true },
                  service: { type: 'string', example: 'analytics' },
                  responseTime: { type: 'number', example: 123 }
                }
              }
            }
          },
          tenant_id: {
            type: 'string',
            example: 'default',
            description: 'ID do tenant'
          },
          correlation_id: {
            type: 'string',
            format: 'uuid',
            example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            description: 'ID de correlação'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-08-11T23:00:00.000Z',
            description: 'Timestamp da verificação'
          }
        }
      },
      ProxyResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['ok', 'status', 'correlation_id', 'tenant_id', 'responseTime'],
            properties: {
              ok: {
                type: 'boolean',
                example: true,
                description: 'Indica se a operação proxy foi bem-sucedida'
              },
              status: {
                type: 'number',
                example: 200,
                description: 'Status HTTP do serviço downstream'
              },
              data: {
                type: 'object',
                description: 'Dados retornados pelo serviço downstream'
              },
              correlation_id: {
                type: 'string',
                format: 'uuid',
                example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                description: 'ID de correlação'
              },
              tenant_id: {
                type: 'string',
                example: 'acme-corp',
                description: 'ID do tenant'
              },
              responseTime: {
                type: 'number',
                example: 150,
                description: 'Tempo de resposta em millisegundos'
              },
              success: {
                type: 'boolean',
                example: true,
                description: 'Indica se o proxy foi executado com sucesso'
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);

/**
 * Log da configuração do Swagger
 */
export function logSwaggerConfig(): void {
  logger.info('Swagger configuration loaded', 'system', 'swagger-init', {
    title: swaggerDefinition.info.title,
    version: swaggerDefinition.info.version,
    servers: swaggerDefinition.servers.length,
    schemas: Object.keys(swaggerDefinition.components.schemas).length,
    apis: options.apis
  });
}
