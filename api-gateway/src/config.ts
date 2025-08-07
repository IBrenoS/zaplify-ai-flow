/**
 * Configuration for API Gateway
 */

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),

  // CORS configuration
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001'
  ],

  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000'
  ],

  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Redis configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Microservices endpoints
  SERVICES: {
    AI_SERVICE: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    WHATSAPP_SERVICE: process.env.WHATSAPP_SERVICE_URL || 'http://localhost:8001',
    ANALYTICS_SERVICE: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8002',
    FUNNEL_SERVICE: process.env.FUNNEL_SERVICE_URL || 'http://localhost:8003'
  },

  // Supabase (for user validation)
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://tcswnrndfpmtxpyiknsg.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc3ducm5kZnBtdHhweWlrbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTc2MzcsImV4cCI6MjA2NzkzMzYzN30.EMZoLh0u2PW6YK8rICz5awhL0rtU4f1U8PrV0nTbl3U',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // WebSocket configuration
  WS_ORIGINS: process.env.WS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000'
  ]
};
