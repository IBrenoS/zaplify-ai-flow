import type { Express } from 'express';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { logSwaggerConfig } from '../src/config/swagger.js';
import { createApp } from '../src/index.js';

describe('OpenAPI/Swagger Documentation Tests', () => {
  let app: Express;
  let request: any;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    // Salvar NODE_ENV original e definir como development para habilitar Swagger
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Criar aplicação de teste
    app = await createApp();
    request = supertest(app);

    // Log da configuração do Swagger
    logSwaggerConfig();
  });

  afterAll(() => {
    // Restaurar NODE_ENV original
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Swagger UI and Documentation Access', () => {
    it('should serve Swagger UI at /docs', async () => {
      const response = await request
        .get('/docs/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('swagger-ui-bundle');
    });

    it('should redirect /api-docs to /docs', async () => {
      const response = await request
        .get('/api-docs')
        .expect(302);

      expect(response.headers.location).toBe('/docs');
    });

    it('should return valid OpenAPI JSON specification at /api-docs.json', async () => {
      const response = await request
        .get('/api-docs.json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const spec = response.body;

      // Validar estrutura básica OpenAPI 3.0
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
      expect(spec).toHaveProperty('servers');

      // Validar informações do projeto
      expect(spec.info).toHaveProperty('title', 'Zaplify AI Flow - API Gateway');
      expect(spec.info).toHaveProperty('version', '1.0.0');
      expect(spec.info).toHaveProperty('description');
      expect(spec.info.description).toContain('API Gateway');
      expect(spec.info.description).toContain('Zaplify AI Flow');

      // Validar contato e licença
      expect(spec.info).toHaveProperty('contact');
      expect(spec.info.contact).toHaveProperty('name', 'Zaplify AI Flow Team');
      expect(spec.info.contact).toHaveProperty('email', 'dev@zaplify.com');
      expect(spec.info).toHaveProperty('license');
      expect(spec.info.license).toHaveProperty('name', 'MIT');

      // Validar servidores
      expect(spec.servers).toBeInstanceOf(Array);
      expect(spec.servers.length).toBeGreaterThan(0);

      const devServer = spec.servers.find((s: any) => s.description === 'Development Server');
      expect(devServer).toBeDefined();
      expect(devServer.url).toBe('http://localhost:8080');

      const prodServer = spec.servers.find((s: any) => s.description === 'Production Server');
      expect(prodServer).toBeDefined();
      expect(prodServer.url).toBe('https://api.zaplify.com');
    });
  });

  describe('Security Schemes Validation', () => {
    it('should define bearerAuth security scheme', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components).toHaveProperty('securitySchemes');
      expect(spec.components.securitySchemes).toHaveProperty('bearerAuth');

      const bearerAuth = spec.components.securitySchemes.bearerAuth;
      expect(bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token obtido através do serviço de autenticação'
      });
    });

    it('should have global security configuration', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec).toHaveProperty('security');
      expect(spec.security).toBeInstanceOf(Array);
      expect(spec.security).toContainEqual({ bearerAuth: [] });
    });
  });

  describe('Global Parameters Validation', () => {
    it('should define correlationId parameter', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components).toHaveProperty('parameters');
      expect(spec.components.parameters).toHaveProperty('correlationId');

      const correlationId = spec.components.parameters.correlationId;
      expect(correlationId).toEqual({
        name: 'x-correlation-id',
        in: 'header',
        description: 'ID único para rastreamento da requisição através dos serviços',
        required: false,
        schema: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        }
      });
    });

    it('should define tenantId parameter', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components.parameters).toHaveProperty('tenantId');

      const tenantId = spec.components.parameters.tenantId;
      expect(tenantId).toEqual({
        name: 'x-tenant-id',
        in: 'header',
        description: 'Identificador do tenant para isolamento de dados',
        required: false,
        schema: {
          type: 'string',
          example: 'acme-corp'
        }
      });
    });
  });

  describe('Schemas Validation', () => {
    it('should define Error schema', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components.schemas).toHaveProperty('Error');

      const errorSchema = spec.components.schemas.Error;
      expect(errorSchema.type).toBe('object');
      expect(errorSchema.required).toEqual(['ok', 'error', 'timestamp']);
      expect(errorSchema.properties).toHaveProperty('ok');
      expect(errorSchema.properties).toHaveProperty('error');
      expect(errorSchema.properties).toHaveProperty('timestamp');
      expect(errorSchema.properties).toHaveProperty('correlation_id');
      expect(errorSchema.properties).toHaveProperty('tenant_id');
    });

    it('should define HealthCheck schema', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components.schemas).toHaveProperty('HealthCheck');

      const healthSchema = spec.components.schemas.HealthCheck;
      expect(healthSchema.type).toBe('object');
      expect(healthSchema.required).toEqual(['ok', 'service', 'timestamp']);
      expect(healthSchema.properties).toHaveProperty('ok');
      expect(healthSchema.properties).toHaveProperty('service');
      expect(healthSchema.properties).toHaveProperty('deps');
      expect(healthSchema.properties).toHaveProperty('timestamp');
    });

    it('should define ProxyResponse schema', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.components.schemas).toHaveProperty('ProxyResponse');

      const proxySchema = spec.components.schemas.ProxyResponse;
      expect(proxySchema.type).toBe('object');
      expect(proxySchema.required).toEqual(['data']);
      expect(proxySchema.properties).toHaveProperty('data');

      const dataProperty = proxySchema.properties.data;
      expect(dataProperty.required).toEqual(['ok', 'status', 'correlation_id', 'tenant_id', 'responseTime']);
    });
  });

  describe('Route Documentation Coverage', () => {
    it('should document /health endpoint', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.paths).toHaveProperty('/health');
      const healthPath = spec.paths['/health'];

      expect(healthPath).toHaveProperty('get');
      const getHealth = healthPath.get;

      expect(getHealth).toHaveProperty('summary', 'Health Check Agregado');
      expect(getHealth).toHaveProperty('description');
      expect(getHealth).toHaveProperty('tags');
      expect(getHealth.tags).toContain('Health Check');
      expect(getHealth).toHaveProperty('parameters');
      expect(getHealth).toHaveProperty('responses');

      // Verificar resposta 200
      expect(getHealth.responses).toHaveProperty('200');
      const response200 = getHealth.responses['200'];
      expect(response200).toHaveProperty('description');
      expect(response200).toHaveProperty('content');
      expect(response200.content).toHaveProperty('application/json');

      const jsonContent = response200.content['application/json'];
      expect(jsonContent).toHaveProperty('schema');
      expect(jsonContent.schema).toHaveProperty('$ref', '#/components/schemas/HealthCheck');
      expect(jsonContent).toHaveProperty('examples');
    });

    it('should document AI conversation proxy endpoint', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.paths).toHaveProperty('/api/v1/ai/conversation');
      const aiPath = spec.paths['/api/v1/ai/conversation'];

      expect(aiPath).toHaveProperty('post');
      const postAi = aiPath.post;

      expect(postAi).toHaveProperty('summary', 'Proxy para IA Conversational');
      expect(postAi).toHaveProperty('description');
      expect(postAi).toHaveProperty('tags');
      expect(postAi.tags).toContain('Proxy Routes - IA');
      expect(postAi).toHaveProperty('security');
      expect(postAi.security).toContainEqual({ bearerAuth: [] });
      expect(postAi).toHaveProperty('requestBody');
      expect(postAi).toHaveProperty('responses');

      // Verificar status codes obrigatórios
      expect(postAi.responses).toHaveProperty('200');
      expect(postAi.responses).toHaveProperty('401');
      expect(postAi.responses).toHaveProperty('403');
      expect(postAi.responses).toHaveProperty('502');
    });

    it('should document WhatsApp status proxy endpoint', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.paths).toHaveProperty('/api/v1/whatsapp/status');
      const whatsappPath = spec.paths['/api/v1/whatsapp/status'];

      expect(whatsappPath).toHaveProperty('get');
      const getWhatsapp = whatsappPath.get;

      expect(getWhatsapp).toHaveProperty('summary', 'Proxy para WhatsApp Status');
      expect(getWhatsapp).toHaveProperty('tags');
      expect(getWhatsapp.tags).toContain('Proxy Routes - WhatsApp');
      expect(getWhatsapp).toHaveProperty('security');
      expect(getWhatsapp.security).toContainEqual({ bearerAuth: [] });
    });

    it('should document Funnel execution proxy endpoint', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.paths).toHaveProperty('/api/v1/funnel/execute');
      const funnelPath = spec.paths['/api/v1/funnel/execute'];

      expect(funnelPath).toHaveProperty('post');
      const postFunnel = funnelPath.post;

      expect(postFunnel).toHaveProperty('summary', 'Proxy para Funnel Engine');
      expect(postFunnel).toHaveProperty('tags');
      expect(postFunnel.tags).toContain('Proxy Routes - Funnel');
      expect(postFunnel).toHaveProperty('security');
      expect(postFunnel.security).toContainEqual({ bearerAuth: [] });
      expect(postFunnel).toHaveProperty('requestBody');
    });

    it('should document Analytics real-time proxy endpoint', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      expect(spec.paths).toHaveProperty('/api/v1/analytics/real-time');
      const analyticsPath = spec.paths['/api/v1/analytics/real-time'];

      expect(analyticsPath).toHaveProperty('get');
      const getAnalytics = analyticsPath.get;

      expect(getAnalytics).toHaveProperty('summary', 'Proxy para Analytics Real-time');
      expect(getAnalytics).toHaveProperty('tags');
      expect(getAnalytics.tags).toContain('Proxy Routes - Analytics');
      expect(getAnalytics).toHaveProperty('security');
      expect(getAnalytics.security).toContainEqual({ bearerAuth: [] });
    });
  });

  describe('Parameter and Response Validation', () => {
    it('should validate that authenticated endpoints reference global parameters', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const authenticatedPaths = [
        '/api/v1/ai/conversation',
        '/api/v1/whatsapp/status',
        '/api/v1/funnel/execute',
        '/api/v1/analytics/real-time'
      ];

      for (const path of authenticatedPaths) {
        expect(spec.paths).toHaveProperty(path);

        const pathSpec = spec.paths[path];
        const methods = Object.keys(pathSpec);

        for (const method of methods) {
          const operation = pathSpec[method];
          expect(operation).toHaveProperty('parameters');

          const parameters = operation.parameters;
          expect(parameters).toBeInstanceOf(Array);

          // Verificar se tem referência para correlationId
          const hasCorrelationId = parameters.some((p: any) =>
            p.$ref === '#/components/parameters/correlationId'
          );
          expect(hasCorrelationId).toBe(true);

          // Verificar se tem referência para tenantId
          const hasTenantId = parameters.some((p: any) =>
            p.$ref === '#/components/parameters/tenantId'
          );
          expect(hasTenantId).toBe(true);
        }
      }
    });

    it('should validate that authenticated endpoints have security requirements', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const authenticatedPaths = [
        '/api/v1/ai/conversation',
        '/api/v1/whatsapp/status',
        '/api/v1/funnel/execute',
        '/api/v1/analytics/real-time'
      ];

      for (const path of authenticatedPaths) {
        const pathSpec = spec.paths[path];
        const methods = Object.keys(pathSpec);

        for (const method of methods) {
          const operation = pathSpec[method];
          expect(operation).toHaveProperty('security');
          expect(operation.security).toContainEqual({ bearerAuth: [] });
        }
      }
    });

    it('should validate that POST endpoints have requestBody documentation', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const postEndpoints = [
        '/api/v1/ai/conversation',
        '/api/v1/funnel/execute'
      ];

      for (const path of postEndpoints) {
        const pathSpec = spec.paths[path];
        expect(pathSpec).toHaveProperty('post');

        const postOperation = pathSpec.post;
        expect(postOperation).toHaveProperty('requestBody');

        const requestBody = postOperation.requestBody;
        expect(requestBody).toHaveProperty('required', true);
        expect(requestBody).toHaveProperty('content');
        expect(requestBody.content).toHaveProperty('application/json');

        const jsonContent = requestBody.content['application/json'];
        expect(jsonContent).toHaveProperty('schema');
        expect(jsonContent).toHaveProperty('examples');
      }
    });

    it('should validate that all endpoints have proper error responses', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const authenticatedPaths = [
        '/api/v1/ai/conversation',
        '/api/v1/whatsapp/status',
        '/api/v1/funnel/execute',
        '/api/v1/analytics/real-time'
      ];

      for (const path of authenticatedPaths) {
        const pathSpec = spec.paths[path];
        const methods = Object.keys(pathSpec);

        for (const method of methods) {
          const operation = pathSpec[method];
          expect(operation).toHaveProperty('responses');

          const responses = operation.responses;

          // Deve ter resposta 401 (Unauthorized)
          expect(responses).toHaveProperty('401');
          const response401 = responses['401'];
          expect(response401).toHaveProperty('description');
          expect(response401).toHaveProperty('content');
          expect(response401.content).toHaveProperty('application/json');
          expect(response401.content['application/json'].schema).toHaveProperty('$ref', '#/components/schemas/Error');

          // Deve ter resposta 403 (Forbidden)
          expect(responses).toHaveProperty('403');
          const response403 = responses['403'];
          expect(response403).toHaveProperty('description');
          expect(response403).toHaveProperty('content');
          expect(response403.content).toHaveProperty('application/json');
          expect(response403.content['application/json'].schema).toHaveProperty('$ref', '#/components/schemas/Error');

          // Deve ter resposta 502 (Bad Gateway)
          expect(responses).toHaveProperty('502');
          const response502 = responses['502'];
          expect(response502).toHaveProperty('description');
          expect(response502).toHaveProperty('content');
          expect(response502.content).toHaveProperty('application/json');
          expect(response502.content['application/json'].schema).toHaveProperty('$ref', '#/components/schemas/Error');
        }
      }
    });
  });

  describe('Tags and Organization', () => {
    it('should organize endpoints by functional tags', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const expectedTags = [
        'Health Check',
        'Proxy Routes - IA',
        'Proxy Routes - WhatsApp',
        'Proxy Routes - Funnel',
        'Proxy Routes - Analytics'
      ];

      // Extrair todas as tags usadas
      const usedTags = new Set<string>();

      for (const path of Object.values(spec.paths) as any[]) {
        for (const method of Object.values(path) as any[]) {
          if (method.tags) {
            method.tags.forEach((tag: string) => usedTags.add(tag));
          }
        }
      }

      // Verificar se todas as tags esperadas estão sendo usadas
      for (const expectedTag of expectedTags) {
        expect(usedTags.has(expectedTag)).toBe(true);
      }
    });
  });

  describe('Examples and Content Quality', () => {
    it('should have meaningful examples in request/response schemas', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      // Verificar exemplos na rota de health check
      const healthPath = spec.paths['/health'];
      const healthResponse = healthPath.get.responses['200'];
      const healthExamples = healthResponse.content['application/json'].examples;

      expect(healthExamples).toHaveProperty('allHealthy');
      expect(healthExamples).toHaveProperty('someUnhealthy');
      expect(healthExamples.allHealthy).toHaveProperty('summary');
      expect(healthExamples.allHealthy).toHaveProperty('value');

      // Verificar exemplos na rota de IA
      const aiPath = spec.paths['/api/v1/ai/conversation'];
      const aiRequestBody = aiPath.post.requestBody;
      const aiExamples = aiRequestBody.content['application/json'].examples;

      expect(aiExamples).toHaveProperty('simpleMessage');
      expect(aiExamples).toHaveProperty('messageWithContext');
      expect(aiExamples.simpleMessage).toHaveProperty('summary');
      expect(aiExamples.simpleMessage).toHaveProperty('value');
    });

    it('should have comprehensive descriptions for all endpoints', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      const paths = Object.keys(spec.paths);

      for (const path of paths) {
        const pathSpec = spec.paths[path];
        const methods = Object.keys(pathSpec);

        for (const method of methods) {
          const operation = pathSpec[method];

          // Verificar se tem summary
          expect(operation).toHaveProperty('summary');
          expect(operation.summary).toBeTruthy();
          expect(operation.summary.length).toBeGreaterThan(5);

          // Verificar se tem description
          expect(operation).toHaveProperty('description');
          expect(operation.description).toBeTruthy();
          expect(operation.description.length).toBeGreaterThan(20);

          // Description deve conter informações úteis
          expect(operation.description).toMatch(/(timeout|header|auth|proxy|service|websocket|stats|broadcast|endpoint|api)/i);
        }
      }
    });
  });

  describe('OpenAPI Specification Compliance', () => {
    it('should be a valid OpenAPI 3.0 specification', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      // Validações básicas de conformidade OpenAPI 3.0
      expect(spec.openapi).toMatch(/^3\.0\./);

      // Info object obrigatório
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();

      // Paths object obrigatório
      expect(spec.paths).toBeDefined();
      expect(typeof spec.paths).toBe('object');

      // Validar que cada path começa com /
      for (const path of Object.keys(spec.paths)) {
        expect(path).toMatch(/^\//);
      }

      // Components válidos
      if (spec.components) {
        if (spec.components.schemas) {
          for (const [schemaName, schema] of Object.entries(spec.components.schemas) as any[]) {
            expect(schema).toHaveProperty('type');
          }
        }

        if (spec.components.parameters) {
          for (const [paramName, param] of Object.entries(spec.components.parameters) as any[]) {
            expect(param).toHaveProperty('name');
            expect(param).toHaveProperty('in');
          }
        }
      }
    });

    it('should validate content types are properly defined', async () => {
      const response = await request.get('/api-docs.json');
      const spec = response.body;

      for (const [pathName, pathSpec] of Object.entries(spec.paths) as any[]) {
        for (const [method, operation] of Object.entries(pathSpec) as any[]) {
          // Verificar requestBody se existir
          if (operation.requestBody && operation.requestBody.content) {
            expect(operation.requestBody.content).toHaveProperty('application/json');
            const jsonContent = operation.requestBody.content['application/json'];
            expect(jsonContent).toHaveProperty('schema');
          }

          // Verificar responses
          if (operation.responses) {
            for (const [statusCode, responseSpec] of Object.entries(operation.responses) as any[]) {
              if (responseSpec.content) {
                expect(responseSpec.content).toHaveProperty('application/json');
                const jsonContent = responseSpec.content['application/json'];
                expect(jsonContent).toHaveProperty('schema');
              }
            }
          }
        }
      }
    });
  });
});
