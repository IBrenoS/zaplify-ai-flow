import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authMiddleware, requireAIScope } from './middlewares/auth.js';
import { correlationMiddleware } from './middlewares/correlation.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';

// Mock da função de logger para evitar ruído nos testes
vi.mock('./utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Authentication Middleware', () => {
  let app: express.Application;
  const JWT_SECRET = 'test-secret-key-for-testing-only';

  beforeEach(() => {
    // Configurar ENV para testes
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';

    // Criar app de teste
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);

    // Rota protegida para testar autenticação básica
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({
        ok: true,
        message: 'Access granted',
        user: req.user,
        correlation_id: req.correlationId
      });
    });

    // Rota que requer scope específico de AI
    app.post('/ai/test', authMiddleware, requireAIScope, (req, res) => {
      res.json({
        ok: true,
        message: 'AI endpoint access granted',
        user: req.user,
        correlation_id: req.correlationId
      });
    });

    // Rota pública para controle
    app.get('/public', (req, res) => {
      res.json({ ok: true, message: 'Public access' });
    });

    app.use(globalErrorHandler);
  });

  describe('JWT Authentication', () => {
    it('should allow access with valid JWT token', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['ai:read', 'api:access']
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        message: 'Access granted',
        user: {
          userId: 'user123',
          tenantId: 'tenant456',
          scopes: ['ai:read', 'api:access']
        }
      });

      expect(response.body.correlation_id).toBeDefined();
    });

    it('should reject request without Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Missing Authorization header'
      });

      expect(response.body.correlation_id).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>'
      });
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Invalid or expired token'
      });
    });

    it('should reject request with expired JWT token', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['ai:read']
      };

      const expiredToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '-1h', // Expirado há 1 hora
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Invalid or expired token'
      });
    });

    it('should reject token with wrong issuer', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['ai:read']
      };

      const wrongIssuerToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'wrong-issuer'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongIssuerToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Invalid or expired token'
      });
    });
  });

  describe('Scope-based Authorization', () => {
    it('should allow access with correct AI scope', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['ai:read', 'ai:conversation', 'api:access']
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .post('/ai/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test AI request' })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        message: 'AI endpoint access granted',
        user: {
          userId: 'user123',
          tenantId: 'tenant456',
          scopes: expect.arrayContaining(['ai:read', 'ai:conversation'])
        }
      });
    });

    it('should deny access without required AI scope', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['funnel:read', 'api:access'] // Sem scopes de AI
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .post('/ai/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test AI request' })
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Insufficient permissions'
      });

      expect(response.body.required_scopes).toEqual(['ai:read']);
      expect(response.body.user_scopes).toEqual(['funnel:read', 'api:access']);
    });

    it('should allow access with ai:write scope (covers ai:read)', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'tenant456',
        scopes: ['ai:write', 'api:access'] // ai:write inclui ai:read
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .post('/ai/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test AI request' })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should allow access with admin scope', async () => {
      const payload = {
        sub: 'admin123',
        tenant_id: 'tenant456',
        scopes: ['ai:admin', 'api:access'] // Admin tem todas as permissões
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .post('/ai/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test AI request' })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('Public Routes', () => {
    it('should allow access to public routes without authentication', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        message: 'Public access'
      });
    });
  });

  describe('Tenant Context', () => {
    it('should extract tenant information from JWT', async () => {
      const payload = {
        sub: 'user123',
        tenant_id: 'acme-corp',
        scopes: ['ai:read', 'api:access']
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.tenantId).toBe('acme-corp');
      expect(response.body.user.userId).toBe('user123');
    });

    it('should handle missing tenant information gracefully', async () => {
      const payload = {
        sub: 'user123',
        // tenant_id ausente
        scopes: ['ai:read', 'api:access']
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'zaplify-auth'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.tenantId).toBe('default');
      expect(response.body.user.userId).toBe('user123');
    });
  });
});
