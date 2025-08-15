import { beforeEach, describe, expect, it } from 'vitest';
import { sessionService } from '../src/services/sessionService.js';
import './setup-mongo';

describe('SessionService', () => {
  const testTenantId = 'test-tenant-1';
  const testSessionId = 'test-session-1';

  beforeEach(async () => {
    // Test setup is handled in setup-mongo.js
  });

  describe('upsertSession', () => {
    it('should create a new session', async () => {
      const session = await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'creating'
      );

      expect(session).toBeDefined();
      expect(session.tenant_id).toBe(testTenantId);
      expect(session.sessionId).toBe(testSessionId);
      expect(session.status).toBe('creating');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should update existing session status', async () => {
      // Create initial session
      await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'creating'
      );

      // Update status
      const updatedSession = await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'open',
        '+1234567890'
      );

      expect(updatedSession.status).toBe('open');
      expect(updatedSession.phoneNumber).toBe('+1234567890');
      expect(updatedSession.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle phone number updates', async () => {
      const phoneNumber = '+5511999887766';

      const session = await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'open',
        phoneNumber
      );

      expect(session.phoneNumber).toBe(phoneNumber);
    });
  });

  describe('getSession', () => {
    it('should return existing session', async () => {
      // Create session
      await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'open'
      );

      // Get session
      const session = await sessionService.getSession(testTenantId, testSessionId);

      expect(session).toBeDefined();
      expect(session!.tenant_id).toBe(testTenantId);
      expect(session!.sessionId).toBe(testSessionId);
      expect(session!.status).toBe('open');
    });

    it('should return null for non-existent session', async () => {
      const session = await sessionService.getSession(testTenantId, 'non-existent');
      expect(session).toBeNull();
    });

    it('should isolate tenants', async () => {
      const otherTenantId = 'other-tenant';

      // Create session for test tenant
      await sessionService.upsertSession(
        testTenantId,
        testSessionId,
        'open'
      );

      // Try to get from different tenant
      const session = await sessionService.getSession(otherTenantId, testSessionId);
      expect(session).toBeNull();
    });
  });

  describe('getSessionsByTenant', () => {
    it('should return all sessions for tenant', async () => {
      // Create multiple sessions
      await sessionService.upsertSession(testTenantId, 'session-1', 'open');
      await sessionService.upsertSession(testTenantId, 'session-2', 'connecting');
      await sessionService.upsertSession(testTenantId, 'session-3', 'close');

      const sessions = await sessionService.getSessionsByTenant(testTenantId);

      expect(sessions).toHaveLength(3);
      expect(sessions.map(s => s.sessionId)).toContain('session-1');
      expect(sessions.map(s => s.sessionId)).toContain('session-2');
      expect(sessions.map(s => s.sessionId)).toContain('session-3');
    });

    it('should respect pagination', async () => {
      // Create multiple sessions
      for (let i = 1; i <= 5; i++) {
        await sessionService.upsertSession(testTenantId, `session-${i}`, 'open');
      }

      // Get first page
      const firstPage = await sessionService.getSessionsByTenant(testTenantId, 2, 0);
      expect(firstPage).toHaveLength(2);

      // Get second page
      const secondPage = await sessionService.getSessionsByTenant(testTenantId, 2, 2);
      expect(secondPage).toHaveLength(2);

      // Get third page
      const thirdPage = await sessionService.getSessionsByTenant(testTenantId, 2, 4);
      expect(thirdPage).toHaveLength(1);
    });

    it('should isolate tenants', async () => {
      const otherTenantId = 'other-tenant';

      // Create sessions for different tenants
      await sessionService.upsertSession(testTenantId, 'session-1', 'open');
      await sessionService.upsertSession(otherTenantId, 'session-2', 'open');

      const sessions = await sessionService.getSessionsByTenant(testTenantId);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session-1');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      // Create session
      await sessionService.upsertSession(testTenantId, testSessionId, 'creating');

      // Update status
      const updatedSession = await sessionService.updateSessionStatus(
        testTenantId,
        testSessionId,
        'open'
      );

      expect(updatedSession).toBeDefined();
      expect(updatedSession!.status).toBe('open');
      expect(updatedSession!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionService.updateSessionStatus(
        testTenantId,
        'non-existent',
        'open'
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      // Create session
      await sessionService.upsertSession(testTenantId, testSessionId, 'open');

      // Delete session
      const deleted = await sessionService.deleteSession(testTenantId, testSessionId);
      expect(deleted).toBe(true);

      // Verify deletion
      const session = await sessionService.getSession(testTenantId, testSessionId);
      expect(session).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const deleted = await sessionService.deleteSession(testTenantId, 'non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getSessionCount', () => {
    it('should return correct count', async () => {
      // Initially should be 0
      let count = await sessionService.getSessionCount(testTenantId);
      expect(count).toBe(0);

      // Create sessions
      await sessionService.upsertSession(testTenantId, 'session-1', 'open');
      await sessionService.upsertSession(testTenantId, 'session-2', 'open');

      count = await sessionService.getSessionCount(testTenantId);
      expect(count).toBe(2);
    });

    it('should isolate tenants', async () => {
      const otherTenantId = 'other-tenant';

      // Create sessions for different tenants
      await sessionService.upsertSession(testTenantId, 'session-1', 'open');
      await sessionService.upsertSession(otherTenantId, 'session-2', 'open');

      const count = await sessionService.getSessionCount(testTenantId);
      expect(count).toBe(1);
    });
  });
});
