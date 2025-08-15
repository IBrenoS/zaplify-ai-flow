import { beforeAll } from 'vitest';

// Setup environment variables for tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  // Set minimal required environment variables for tests
  process.env.EVOLUTION_BASE_URL = 'http://localhost:3000';
  process.env.EVOLUTION_API_KEY = 'test-key';
  process.env.EVOLUTION_SESSION_ID = 'test-session';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.PORT = '8081';
});
