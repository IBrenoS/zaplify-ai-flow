import { Db, MongoClient } from 'mongodb';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

class MongoConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      return;
    }

    try {
      // Use env var if set, otherwise use config
      const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;

      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();

      // Extract database name from URI or use default
      const url = new URL(mongoUri);
      const dbName = url.pathname.slice(1) || 'zaplify-whatsapp';

      this.db = this.client.db(dbName);
      this.isConnected = true;

      logger.info({
        msg: 'MongoDB connected successfully',
        database: dbName,
        uri: mongoUri.replace(/\/\/[^@]+@/, '//***:***@'), // Hide credentials in logs
      });

      // Create indexes for better performance
      await this.createIndexes();

    } catch (error) {
      logger.error({
        msg: 'Failed to connect to MongoDB',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        this.db = null;
        this.client = null;

        logger.info({
          msg: 'MongoDB disconnected successfully',
        });
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting from MongoDB',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  getDb(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  isReady(): boolean {
    return this.isConnected && this.db !== null;
  }

  getClient(): MongoClient | null {
    return this.client;
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Sessions collection indexes
      await this.db.collection('sessions').createIndexes([
        { key: { tenant_id: 1, sessionId: 1 }, unique: true },
        { key: { tenant_id: 1 } },
        { key: { updatedAt: 1 } },
      ]);

      // Messages collection indexes
      await this.db.collection('messages').createIndexes([
        { key: { tenant_id: 1, messageId: 1 }, unique: true },
        { key: { tenant_id: 1, from: 1, to: 1 } },
        { key: { tenant_id: 1, 'timestamps.createdAt': -1 } },
        { key: { 'timestamps.createdAt': -1 } },
      ]);

      logger.info({
        msg: 'MongoDB indexes created successfully',
      });
    } catch (error) {
      logger.warn({
        msg: 'Failed to create some MongoDB indexes',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Singleton instance
const mongoConnection = new MongoConnection();

export const connectMongo = () => mongoConnection.connect();
export const disconnectMongo = () => mongoConnection.disconnect();
export const getDb = () => mongoConnection.getDb();
export const isMongoReady = () => mongoConnection.isReady();
export const getMongoClient = () => mongoConnection.getClient();

export { mongoConnection };
