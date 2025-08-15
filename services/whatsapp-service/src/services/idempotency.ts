import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

interface IdempotencyService {
  isDuplicate(messageId: string, tenantId: string): Promise<boolean>;
  markProcessed(messageId: string, tenantId: string): Promise<void>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

class RedisIdempotencyService implements IdempotencyService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    if (config.REDIS_URL) {
      this.client = createClient({
        url: config.REDIS_URL,
      });

      this.client.on('error', (error) => {
        logger.error({
          msg: 'Redis client error',
          error: error instanceof Error ? error.message : String(error),
        });
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info({
          msg: 'Redis client connected',
        });
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
        logger.warn({
          msg: 'Redis client disconnected',
        });
      });
    }
  }

  async connect(): Promise<void> {
    if (this.client && !this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error({
          msg: 'Failed to connect to Redis',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  async isDuplicate(messageId: string, tenantId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false; // Fallback to allow processing
    }

    try {
      const key = `webhook:${tenantId}:${messageId}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error({
        msg: 'Redis isDuplicate error, allowing processing',
        messageId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false; // Fallback to allow processing
    }
  }

  async markProcessed(messageId: string, tenantId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return; // Silently fail if Redis unavailable
    }

    try {
      const key = `webhook:${tenantId}:${messageId}`;
      const ttlSeconds = 10 * 60; // 10 minutes
      await this.client.setEx(key, ttlSeconds, 'processed');
    } catch (error) {
      logger.error({
        msg: 'Redis markProcessed error',
        messageId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - webhook should succeed even if Redis fails
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting Redis client',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

class MemoryIdempotencyService implements IdempotencyService {
  private processedMessages = new Map<string, number>();

  async isDuplicate(messageId: string, tenantId: string): Promise<boolean> {
    const key = `${tenantId}:${messageId}`;
    const now = Date.now();
    const ttl = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Clean up expired entries
    for (const [k, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > ttl) {
        this.processedMessages.delete(k);
      }
    }

    return this.processedMessages.has(key);
  }

  async markProcessed(messageId: string, tenantId: string): Promise<void> {
    const key = `${tenantId}:${messageId}`;
    this.processedMessages.set(key, Date.now());
  }
}

// Create the appropriate service based on configuration
const createIdempotencyService = (): IdempotencyService => {
  if (config.REDIS_URL) {
    return new RedisIdempotencyService();
  } else {
    logger.info({
      msg: 'Redis not configured, using memory-based idempotency',
    });
    return new MemoryIdempotencyService();
  }
};

const idempotencyService = createIdempotencyService();

export { idempotencyService, type IdempotencyService };
