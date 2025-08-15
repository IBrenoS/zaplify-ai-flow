import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const windowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 60000;
const max = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100;

// Create rate limiter configuration
const rateLimiterOptions: any = {
  windowMs,
  max,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  message: {
    ok: false,
    error: 'Too many requests',
    correlation_id: '',
  },
  handler: (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId || req.headers['x-correlation-id'] as string || `req-${Date.now()}`;

    res.status(429).json({
      ok: false,
      error: 'Too many requests',
      correlation_id: correlationId,
    });
  },
  skip: () => false, // Don't skip any requests
  // Use default key generator to avoid IPv6 issues
};

// Use Redis store if configured
if (process.env.RATE_LIMIT_REDIS_URL) {
  try {
    // Dynamic import for Redis dependencies
    const Redis = require('ioredis');
    const RedisStore = require('rate-limit-redis');

    const redisClient = new Redis(process.env.RATE_LIMIT_REDIS_URL);

    rateLimiterOptions.store = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
    });

    console.log('Rate limiting using Redis store');
  } catch (error) {
    // Fallback to memory store if Redis setup fails
    console.warn('Failed to setup Redis store for rate limiting, using memory store:', error);
  }
}

export const publicRateLimiter = rateLimit(rateLimiterOptions);
