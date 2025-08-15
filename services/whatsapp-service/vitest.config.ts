import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
      EVOLUTION_BASE_URL: 'http://localhost:3000',
      EVOLUTION_API_KEY: 'test_api_key',
      EVOLUTION_SESSION_ID: '1',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      EVOLUTION_WEBHOOK_SECRET: 'test_webhook_secret_123',
      ENABLE_KAFKA: 'false',
      USE_S3: 'false',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/'],
    },
  },
});
