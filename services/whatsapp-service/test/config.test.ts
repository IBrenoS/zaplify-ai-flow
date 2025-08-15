import { describe, expect, it } from 'vitest';
import { config } from '../src/config/env.js';

describe('Environment Configuration', () => {
  it('should have required config values', () => {
    expect(config.PORT).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
    expect(config.EVOLUTION_BASE_URL).toBeDefined();
    expect(config.EVOLUTION_API_KEY).toBeDefined();
    expect(config.EVOLUTION_SESSION_ID).toBeDefined();
    expect(config.MONGODB_URI).toBeDefined();
  });

  it('should parse numeric values', () => {
    expect(typeof config.PORT).toBe('number');
    expect(config.PORT).toBeGreaterThan(0);
  });

  it('should have valid environment', () => {
    expect(['development', 'production', 'test']).toContain(config.NODE_ENV);
  });

  it('should have valid URLs', () => {
    expect(config.EVOLUTION_BASE_URL).toMatch(/^https?:\/\/.+/);
    expect(config.MONGODB_URI).toMatch(/^mongodb/);
  });

  it('should handle optional values', () => {
    // REDIS_URL é opcional
    expect(config.REDIS_URL).toBeUndefined();
  });
});
