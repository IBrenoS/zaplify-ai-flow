import type { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Service API',
      version: '1.0.0',
      description: 'API for WhatsApp messaging service with session management, message sending, and webhook handling',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        CorrelationId: {
          name: 'x-correlation-id',
          in: 'header',
          description: 'Unique identifier for request tracking',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        TenantId: {
          name: 'x-tenant-id',
          in: 'header',
          description: 'Tenant identifier for multi-tenancy',
          required: false,
          schema: {
            type: 'string',
          },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            correlation_id: {
              type: 'string',
              description: 'Request correlation ID',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            correlation_id: {
              type: 'string',
              description: 'Request correlation ID',
            },
          },
        },
        SendMessageRequest: {
          type: 'object',
          required: ['to'],
          properties: {
            sessionId: {
              type: 'string',
              description: 'WhatsApp session ID (defaults to tenant ID)',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number (with country code)',
              example: '5511999999999',
            },
            text: {
              type: 'string',
              description: 'Message text content',
              example: 'Hello, World!',
            },
            mediaUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL of media file to send',
              example: 'https://example.com/image.jpg',
            },
          },
        },
        WebhookEvent: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Event type',
              example: 'messages.upsert',
            },
            data: {
              type: 'object',
              description: 'Event data payload',
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check endpoint',
          description: 'Returns service health status',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'ok',
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                      uptime: {
                        type: 'number',
                        description: 'Uptime in seconds',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/sessions/connect': {
        post: {
          tags: ['Sessions'],
          summary: 'Start WhatsApp session',
          description: 'Creates and starts a new WhatsApp session',
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionId: {
                      type: 'string',
                      description: 'Custom session ID (defaults to tenant ID)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session started successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Success' },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '502': {
              description: 'External service error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/sessions/qr-code': {
        get: {
          tags: ['Sessions'],
          summary: 'Get QR code for session',
          description: 'Retrieves QR code for WhatsApp authentication',
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
            {
              name: 'sessionId',
              in: 'query',
              description: 'Session ID (defaults to tenant ID)',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'QR code retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Success' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              qrCode: {
                                type: 'string',
                                description: 'Base64 encoded QR code image',
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Missing session ID',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '502': {
              description: 'External service error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/sessions/status': {
        get: {
          tags: ['Sessions'],
          summary: 'Get session status',
          description: 'Retrieves current status of WhatsApp session',
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
            {
              name: 'sessionId',
              in: 'query',
              description: 'Session ID (defaults to tenant ID)',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Session status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Success' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              status: {
                                type: 'string',
                                enum: ['open', 'close', 'connecting'],
                                description: 'Session connection status',
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Missing session ID',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '502': {
              description: 'External service error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/messages/send-message': {
        post: {
          tags: ['Messages'],
          summary: 'Send WhatsApp message',
          description: 'Sends text or media message via WhatsApp',
          security: [
            {},
            { BearerAuth: [] },
          ],
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendMessageRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Message sent successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Success' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              messageId: {
                                type: 'string',
                                description: 'WhatsApp message ID',
                              },
                              status: {
                                type: 'string',
                                description: 'Message status',
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Unauthorized (when JWT is required)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '502': {
              description: 'External service error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/media/upload': {
        post: {
          tags: ['Media'],
          summary: 'Upload media file',
          description: 'Uploads media file for WhatsApp messaging',
          security: [
            {},
            { BearerAuth: [] },
          ],
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'Media file to upload (max 50MB)',
                    },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'File uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Success' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              url: {
                                type: 'string',
                                format: 'uri',
                                description: 'URL of uploaded file',
                              },
                              filename: {
                                type: 'string',
                                description: 'Generated filename',
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'File upload error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Unauthorized (when JWT is required)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/webhook': {
        post: {
          tags: ['Webhook'],
          summary: 'Receive WhatsApp webhook',
          description: 'Receives webhook events from WhatsApp/Evolution API',
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookEvent' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Webhook processed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Success' },
                },
              },
            },
            '400': {
              description: 'Invalid webhook data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/conversations': {
        get: {
          tags: ['Conversations'],
          summary: 'Get conversations',
          description: 'Retrieves list of conversations for tenant',
          parameters: [
            { $ref: '#/components/parameters/CorrelationId' },
            { $ref: '#/components/parameters/TenantId' },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of conversations to return',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: 'offset',
              in: 'query',
              description: 'Number of conversations to skip',
              required: false,
              schema: {
                type: 'integer',
                minimum: 0,
                default: 0,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Conversations retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Success' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              conversations: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    from: {
                                      type: 'string',
                                      description: 'Participant phone number',
                                    },
                                    to: {
                                      type: 'string',
                                      description: 'Session ID',
                                    },
                                    messageCount: {
                                      type: 'integer',
                                      description: 'Total messages in conversation',
                                    },
                                    lastMessage: {
                                      type: 'object',
                                      description: 'Last message in conversation',
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Serve swagger docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'WhatsApp Service API',
  }));

  // Serve OpenAPI JSON
  app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}
