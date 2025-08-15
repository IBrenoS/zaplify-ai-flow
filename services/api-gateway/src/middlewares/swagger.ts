import type { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

import { configHelpers } from '../config/env.js';
import { logSwaggerConfig, swaggerSpec } from '../config/swagger.js';
import { logger } from '../utils/index.js';

/**
 * Configura e habilita a documentação Swagger/OpenAPI
 * Disponível apenas quando configuração permite
 */
export function setupSwaggerDocs(app: Application): void {
  const isSwaggerEnabled = configHelpers.isSwaggerEnabled();

  if (!isSwaggerEnabled) {
    logger.info('Swagger documentation disabled in production', 'system', 'swagger-setup', {
      nodeEnv: process.env.NODE_ENV,
      enabled: false
    });
    return;
  }

  try {
    // Log da configuração
    logSwaggerConfig();

    // Configuração customizada do Swagger UI
    const swaggerOptions = {
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 50px 0; }
        .swagger-ui .info .title { color: #2c3e50; }
        .swagger-ui .scheme-container { background: #f8f9fa; }
        .swagger-ui .btn.authorize { background-color: #3498db; border-color: #3498db; }
        .swagger-ui .btn.execute { background-color: #27ae60; border-color: #27ae60; }
      `,
      customSiteTitle: 'Zaplify AI Flow - API Gateway Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      }
    };

    // Rota para servir o JSON da spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Rota principal da documentação
    app.use('/docs', swaggerUi.serve);
    app.get('/docs', swaggerUi.setup(swaggerSpec, swaggerOptions));

    // Rota de redirecionamento
    app.get('/api-docs', (req, res) => {
      res.redirect('/docs');
    });

    logger.info('Swagger documentation enabled', 'system', 'swagger-setup', {
      nodeEnv: process.env.NODE_ENV,
      enabled: true,
      docsUrl: '/docs',
      specUrl: '/api-docs.json',
      redirectUrl: '/api-docs',
      title: swaggerOptions.customSiteTitle
    });

  } catch (error) {
    logger.error('Failed to setup Swagger documentation', 'system', 'swagger-setup', {
      error: error instanceof Error ? error.message : String(error),
      nodeEnv: process.env.NODE_ENV
    });
  }
}

/**
 * Middleware para adicionar informações do Swagger nos logs
 */
export function addSwaggerInfo(req: any, res: any, next: any): void {
  // Adiciona informação se a requisição é para docs
  if (req.path.startsWith('/docs') || req.path.startsWith('/api-docs')) {
    req.isSwaggerRequest = true;
  }
  next();
}
