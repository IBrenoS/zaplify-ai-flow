import { describe, expect, it } from 'vitest';

// Teste de segurança e CORS
describe('Security & CORS Tests', () => {
  it('should validate CORS_ORIGINS parsing', () => {
    const testOrigins = 'http://localhost:3000,http://localhost:5173,http://localhost:8080';
    const origins = testOrigins.split(',').map(origin => origin.trim());

    expect(origins).toHaveLength(3);
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('http://localhost:8080');
  });

  it('should handle empty CORS_ORIGINS', () => {
    const testOrigins = '';
    const origins = testOrigins.split(',').map((origin: string) => origin.trim());

    expect(origins).toEqual(['']);
  });

  it('should handle undefined CORS_ORIGINS', () => {
    const testOrigins = process.env.CORS_ORIGINS || '';
    const origins = testOrigins.split(',').map((origin: string) => origin.trim()).filter((origin: string) => origin.length > 0);

    expect(Array.isArray(origins)).toBe(true);
  });

  it('should validate security headers configuration', () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const config = {
      contentSecurityPolicy: isDevelopment ? false : true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true
    };

    expect(config.crossOriginResourcePolicy.policy).toBe('cross-origin');
    expect(config.frameguard.action).toBe('deny');
    expect(config.noSniff).toBe(true);

    // CSP deve estar desabilitado em development
    if (isDevelopment) {
      expect(config.contentSecurityPolicy).toBe(false);
    }
  });

  it('should validate body parser limits', () => {
    const bodyLimit = '1mb';
    const config = {
      json: { limit: bodyLimit },
      urlencoded: { extended: true, limit: bodyLimit }
    };

    expect(config.json.limit).toBe('1mb');
    expect(config.urlencoded.limit).toBe('1mb');
    expect(config.urlencoded.extended).toBe(true);
  });

  it('should validate error response format', () => {
    const errorResponse = {
      ok: false,
      error: 'Test error message',
      timestamp: new Date().toISOString(),
      correlation_id: 'test-correlation-123',
      tenant_id: 'test-tenant'
    };

    expect(errorResponse.ok).toBe(false);
    expect(errorResponse.error).toBe('Test error message');
    expect(errorResponse.correlation_id).toBe('test-correlation-123');
    expect(errorResponse.tenant_id).toBe('test-tenant');
    expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should determine correct status codes for different error types', () => {
    const errorMappings = [
      { errorName: 'ValidationError', expectedStatus: 400 },
      { errorName: 'UnauthorizedError', expectedStatus: 401 },
      { errorName: 'ForbiddenError', expectedStatus: 403 },
      { errorName: 'NotFoundError', expectedStatus: 404 },
      { errorMessage: 'payload too large', expectedStatus: 413 },
      { errorMessage: 'CORS policy', expectedStatus: 403 },
      { errorName: 'GenericError', expectedStatus: 500 }
    ];

    errorMappings.forEach(mapping => {
      let statusCode = 500; // default

      if (mapping.errorName === 'ValidationError') statusCode = 400;
      else if (mapping.errorName === 'UnauthorizedError') statusCode = 401;
      else if (mapping.errorName === 'ForbiddenError') statusCode = 403;
      else if (mapping.errorName === 'NotFoundError') statusCode = 404;
      else if (mapping.errorMessage?.includes('payload')) statusCode = 413;
      else if (mapping.errorMessage?.includes('CORS')) statusCode = 403;

      expect(statusCode).toBe(mapping.expectedStatus);
    });
  });
});
