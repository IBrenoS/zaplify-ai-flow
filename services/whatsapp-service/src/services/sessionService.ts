import { Collection } from 'mongodb';
import { logger } from '../config/logger.js';
import { getDb } from '../db/mongo.js';
import { Session, validateSession } from '../models/Session.js';

export class SessionService {
  private get collection(): Collection<Session> {
    return getDb().collection<Session>('sessions');
  }

  /**
   * Create or update a session (upsert)
   */
  async upsertSession(
    tenantId: string,
    sessionId: string,
    status: Session['status'],
    phoneNumber?: string
  ): Promise<Session> {
    try {
      const filter = { tenant_id: tenantId, sessionId };
      const now = new Date();

      const update = {
        $set: {
          status,
          phoneNumber,
          updatedAt: now,
        },
        $setOnInsert: {
          tenant_id: tenantId,
          sessionId,
          createdAt: now,
        },
      };

      const result = await this.collection.findOneAndUpdate(
        filter,
        update,
        {
          upsert: true,
          returnDocument: 'after',
        }
      );

      if (!result) {
        throw new Error('Failed to upsert session');
      }

      logger.info({
        msg: 'Session upserted successfully',
        tenantId,
        sessionId,
        status,
        hasPhoneNumber: !!phoneNumber,
      });

      return validateSession(result);
    } catch (error) {
      logger.error({
        msg: 'Failed to upsert session',
        tenantId,
        sessionId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get session by tenant and session ID
   */
  async getSession(tenantId: string, sessionId: string): Promise<Session | null> {
    try {
      const session = await this.collection.findOne({
        tenant_id: tenantId,
        sessionId,
      });

      if (session) {
        return validateSession(session);
      }

      return null;
    } catch (error) {
      logger.error({
        msg: 'Failed to get session',
        tenantId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all sessions for a tenant
   */
  async getSessionsByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Session[]> {
    try {
      const sessions = await this.collection
        .find({ tenant_id: tenantId })
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      return sessions.map(session => validateSession(session));
    } catch (error) {
      logger.error({
        msg: 'Failed to get sessions by tenant',
        tenantId,
        limit,
        offset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    tenantId: string,
    sessionId: string,
    status: Session['status']
  ): Promise<Session | null> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { tenant_id: tenantId, sessionId },
        {
          $set: {
            status,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return null;
      }

      logger.info({
        msg: 'Session status updated',
        tenantId,
        sessionId,
        status,
      });

      return validateSession(result);
    } catch (error) {
      logger.error({
        msg: 'Failed to update session status',
        tenantId,
        sessionId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(tenantId: string, sessionId: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({
        tenant_id: tenantId,
        sessionId,
      });

      const deleted = result.deletedCount > 0;

      logger.info({
        msg: 'Session deletion attempted',
        tenantId,
        sessionId,
        deleted,
      });

      return deleted;
    } catch (error) {
      logger.error({
        msg: 'Failed to delete session',
        tenantId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get total count of sessions for a tenant
   */
  async getSessionCount(tenantId: string): Promise<number> {
    try {
      return await this.collection.countDocuments({ tenant_id: tenantId });
    } catch (error) {
      logger.error({
        msg: 'Failed to get session count',
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Singleton instance
export const sessionService = new SessionService();
