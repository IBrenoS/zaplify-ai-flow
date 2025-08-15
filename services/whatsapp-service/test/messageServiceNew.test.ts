import { beforeEach, describe, expect, it } from 'vitest';
import { createInboundMessage, createOutboundMessage } from '../src/models/Message.js';
import { messageService } from '../src/services/messageService.js';
import './setup-mongo';

describe('MessageService', () => {
  const testTenantId = 'test-tenant-1';
  const testSessionId = 'test-session-1';
  const testPhoneNumber = '+5511999887766';

  beforeEach(async () => {
    // Test setup is handled in setup-mongo
  });

  describe('saveMessage', () => {
    it('should save a new inbound message', async () => {
      const messageData = createInboundMessage(
        testTenantId,
        'msg-001',
        testPhoneNumber,
        testSessionId,
        'Hello, this is a test message'
      );

      const savedMessage = await messageService.saveMessage(messageData);

      expect(savedMessage).toBeDefined();
      expect(savedMessage._id).toBeDefined();
      expect(savedMessage.tenant_id).toBe(testTenantId);
      expect(savedMessage.messageId).toBe('msg-001');
      expect(savedMessage.direction).toBe('in');
      expect(savedMessage.text).toBe('Hello, this is a test message');
      expect(savedMessage.timestamps.createdAt).toBeInstanceOf(Date);
    });

    it('should save a new outbound message with status', async () => {
      const messageData = createOutboundMessage(
        testTenantId,
        'msg-002',
        testSessionId,
        testPhoneNumber,
        'Hello, this is an outbound message'
      );

      const savedMessage = await messageService.saveMessage(messageData);

      expect(savedMessage).toBeDefined();
      expect(savedMessage._id).toBeDefined();
      expect(savedMessage.tenant_id).toBe(testTenantId);
      expect(savedMessage.messageId).toBe('msg-002');
      expect(savedMessage.direction).toBe('out');
      expect(savedMessage.text).toBe('Hello, this is an outbound message');
      expect(savedMessage.status).toBe('pending');
      expect(savedMessage.timestamps.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getMessage', () => {
    it('should return existing message', async () => {
      const messageData = createInboundMessage(
        testTenantId,
        'msg-004',
        testPhoneNumber,
        testSessionId,
        'Test message'
      );

      await messageService.saveMessage(messageData);

      const message = await messageService.getMessage(testTenantId, 'msg-004');

      expect(message).toBeDefined();
      expect(message!.messageId).toBe('msg-004');
      expect(message!.text).toBe('Test message');
    });

    it('should return null for non-existent message', async () => {
      const message = await messageService.getMessage(testTenantId, 'non-existent');

      expect(message).toBeNull();
    });
  });

  describe('getMessageCount', () => {
    it('should return total count for tenant', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-020', testPhoneNumber, testSessionId, 'Message 1'),
        createInboundMessage(testTenantId, 'msg-021', testPhoneNumber, testSessionId, 'Message 2'),
        createInboundMessage('other-tenant', 'msg-022', testPhoneNumber, testSessionId, 'Message 3'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const count = await messageService.getMessageCount(testTenantId);

      expect(count).toBe(2);
    });
  });
});
