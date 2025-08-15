import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do node-fetch ANTES dos imports
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

import fetch from 'node-fetch';

import { ProxyService } from './proxy.js';

const mockFetch = vi.mocked(fetch);

describe('ProxyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('proxyRequest', () => {
    it('deve fazer proxy de requisição GET com sucesso', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue('{"message":"Success"}')
      } as any);

      // Act
      const result = await ProxyService.proxyRequest({
        method: 'GET',
        url: 'http://test-service:8001/endpoint',
        headers: { 'x-correlation-id': 'test-correlation', 'x-tenant-id': 'test-tenant' },
        tenantId: 'test-tenant',
        correlationId: 'test-correlation'
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ message: 'Success' });
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('deve tratar timeout de requisição', async () => {
      // Mock fetch que rejeita com AbortError
      mockFetch.mockRejectedValue(new Error('The operation was aborted.'));

      // Act
      const result = await ProxyService.proxyRequest({
        method: 'GET',
        url: 'http://slow-service:8001/slow-endpoint',
        headers: { 'x-correlation-id': 'test-correlation', 'x-tenant-id': 'test-tenant' },
        tenantId: 'test-tenant',
        correlationId: 'test-correlation',
        config: { timeout: 50 }
      });

      // Assert
      expect(result.status).toBe(502);
      expect(result.error).toContain('aborted');
      expect(result.ok).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createBadGatewayResponse', () => {
    it('deve criar resposta de erro 502 padronizada', () => {
      // Act
      const response = ProxyService.createBadGatewayResponse(
        'Connection timeout',
        'test-correlation',
        'test-tenant',
        100
      );

      // Assert
      expect(response.data.status).toBe(502);
      expect(response.data.error).toBe('Connection timeout');
      expect(response.data.ok).toBe(false);
      expect(response.data.tenant_id).toBe('test-tenant');
      expect(response.data.correlation_id).toBe('test-correlation');
      expect(response.data.responseTime).toBe(100);
    });
  });
});
