import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // Service Configuration
  NODE_ENV: string;
  PORT: number;
  SERVICE_NAME: string;
  SERVICE_VERSION: string;
  HOST: string;

  // Database Configuration
  DATABASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;

  // Redis Configuration
  REDIS_URL: string;
  REDIS_PASSWORD?: string;

  // Queue Configuration
  QUEUE_REDIS_URL: string;
  QUEUE_REDIS_PASSWORD?: string;

  // API Configuration
  API_GATEWAY_URL: string;
  AI_SERVICE_URL: string;
  WHATSAPP_SERVICE_URL: string;
  ANALYTICS_SERVICE_URL: string;

  // Security
  JWT_SECRET: string;
  API_KEY: string;

  // Execution Configuration
  MAX_CONCURRENT_EXECUTIONS: number;
  EXECUTION_TIMEOUT: number;
  MAX_RETRY_ATTEMPTS: number;
  RETRY_DELAY: number;

  // Trigger Configuration
  TRIGGER_CHECK_INTERVAL: number;
  WEBHOOK_TIMEOUT: number;
  WEBHOOK_RETRY_ATTEMPTS: number;

  // Flow Configuration
  MAX_FLOW_NODES: number;
  MAX_FLOW_DEPTH: number;
  FLOW_CACHE_TTL: number;

  // Logging
  LOG_LEVEL: string;
  LOG_FORMAT: string;

  // Monitoring
  HEALTH_CHECK_INTERVAL: number;
  METRICS_COLLECTION_INTERVAL: number;
}

const config: Config = {
  // Service Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8004', 10),
  SERVICE_NAME: process.env.SERVICE_NAME || 'funnel-engine',
  SERVICE_VERSION: process.env.SERVICE_VERSION || '1.0.0',
  HOST: process.env.HOST || '0.0.0.0',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/zaplify_funnel',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Queue Configuration
  QUEUE_REDIS_URL: process.env.QUEUE_REDIS_URL || 'redis://localhost:6379',
  QUEUE_REDIS_PASSWORD: process.env.QUEUE_REDIS_PASSWORD,

  // API Configuration
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:8000',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL || 'http://localhost:8002',
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8003',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-key-for-funnel-engine',
  API_KEY: process.env.API_KEY || 'your-api-key-for-funnel-engine',

  // Execution Configuration
  MAX_CONCURRENT_EXECUTIONS: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '50', 10),
  EXECUTION_TIMEOUT: parseInt(process.env.EXECUTION_TIMEOUT || '300000', 10), // 5 minutes
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || '5000', 10), // 5 seconds

  // Trigger Configuration
  TRIGGER_CHECK_INTERVAL: parseInt(process.env.TRIGGER_CHECK_INTERVAL || '30000', 10), // 30 seconds
  WEBHOOK_TIMEOUT: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10), // 10 seconds
  WEBHOOK_RETRY_ATTEMPTS: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),

  // Flow Configuration
  MAX_FLOW_NODES: parseInt(process.env.MAX_FLOW_NODES || '100', 10),
  MAX_FLOW_DEPTH: parseInt(process.env.MAX_FLOW_DEPTH || '20', 10),
  FLOW_CACHE_TTL: parseInt(process.env.FLOW_CACHE_TTL || '3600', 10), // 1 hour

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'json',

  // Monitoring
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10), // 1 minute
  METRICS_COLLECTION_INTERVAL: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '30000', 10), // 30 seconds
};

export default config;
