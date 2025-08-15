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

    it('should save message with media', async () => {
      const messageData = createInboundMessage(
        testTenantId,
        'msg-003',
        testPhoneNumber,
        testSessionId,
        'Check this image',
        ['https://example.com/image.jpg']
      );

      const savedMessage = await messageService.saveMessage(messageData);

      expect(savedMessage).toBeDefined();
      expect(savedMessage.mediaUrls).toEqual(['https://example.com/image.jpg']);
      expect(savedMessage.text).toBe('Check this image');
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

    it('should isolate tenants', async () => {
      const messageData = createInboundMessage(
        'tenant-1',
        'msg-005',
        testPhoneNumber,
        testSessionId,
        'Tenant 1 message'
      );

      await messageService.saveMessage(messageData);

      // Try to get with different tenant
      const message = await messageService.getMessage('tenant-2', 'msg-005');

      expect(message).toBeNull();
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages for conversation', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-006', testPhoneNumber, testSessionId, 'First message'),
        createOutboundMessage(testTenantId, 'msg-007', testSessionId, testPhoneNumber, 'Second message'),
        createInboundMessage(testTenantId, 'msg-008', testPhoneNumber, testSessionId, 'Third message'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const conversationMessages = await messageService.getConversationMessages(
        testTenantId,
        testPhoneNumber,
        testSessionId
      );

      expect(conversationMessages).toHaveLength(3);
      // Should be ordered by creation time (newest first)
      expect(conversationMessages[0].text).toBe('Third message');
      expect(conversationMessages[1].text).toBe('Second message');
      expect(conversationMessages[2].text).toBe('First message');
    });

    it('should respect pagination', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-009', testPhoneNumber, testSessionId, 'First message'),
        createInboundMessage(testTenantId, 'msg-010', testPhoneNumber, testSessionId, 'Second message'),
        createInboundMessage(testTenantId, 'msg-011', testPhoneNumber, testSessionId, 'Third message'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const firstPage = await messageService.getConversationMessages(
        testTenantId,
        testPhoneNumber,
        testSessionId,
        2
      );

      expect(firstPage).toHaveLength(2);
      expect(firstPage[0].text).toBe('Third message');
      expect(firstPage[1].text).toBe('Second message');

      const secondPage = await messageService.getConversationMessages(
        testTenantId,
        testPhoneNumber,
        testSessionId,
        2,
        2
      );

      expect(secondPage).toHaveLength(1);
      expect(secondPage[0].text).toBe('First message');
    });
  });

  describe('getMessagesByTenant', () => {
    it('should return all messages for tenant', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-012', testPhoneNumber, testSessionId, 'Message 1'),
        createOutboundMessage(testTenantId, 'msg-013', testSessionId, testPhoneNumber, 'Message 2'),
        createInboundMessage('other-tenant', 'msg-014', testPhoneNumber, testSessionId, 'Message 3'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const tenantMessages = await messageService.getMessagesByTenant(testTenantId);

      expect(tenantMessages).toHaveLength(2);
      expect(tenantMessages.every(msg => msg.tenant_id === testTenantId)).toBe(true);
    });

    it('should filter by direction', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-015', testPhoneNumber, testSessionId, 'Inbound message'),
        createOutboundMessage(testTenantId, 'msg-016', testSessionId, testPhoneNumber, 'Outbound message'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const inboundMessages = await messageService.getMessagesByTenant(testTenantId, 10, 0, 'in');
      const outboundMessages = await messageService.getMessagesByTenant(testTenantId, 10, 0, 'out');

      expect(inboundMessages).toHaveLength(1);
      expect(inboundMessages[0].direction).toBe('in');

      expect(outboundMessages).toHaveLength(1);
      expect(outboundMessages[0].direction).toBe('out');
    });
  });

  describe('getConversations', () => {
    it('should return conversations with last message and count', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-017', '+5511111111111', testSessionId, 'First conversation message'),
        createInboundMessage(testTenantId, 'msg-018', '+5522222222222', testSessionId, 'Second conversation message'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const conversations = await messageService.getConversations(testTenantId);

      expect(conversations).toHaveLength(2);
      expect(conversations[0].lastMessage.text).toBe('Second conversation message');
      expect(conversations[0].messageCount).toBe(1);

      expect(conversations[1].lastMessage.text).toBe('First conversation message');
      expect(conversations[1].messageCount).toBe(1);
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      const messageData = createOutboundMessage(
        testTenantId,
        'msg-019',
        testSessionId,
        testPhoneNumber,
        'Status test message'
      );

      await messageService.saveMessage(messageData);

      const updatedMessage = await messageService.updateMessageStatus(
        testTenantId,
        'msg-019',
        'delivered'
      );

      expect(updatedMessage).toBeDefined();
      expect(updatedMessage!.status).toBe('delivered');
      expect(updatedMessage!.timestamps.deliveredAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent message', async () => {
      const updatedMessage = await messageService.updateMessageStatus(
        testTenantId,
        'non-existent',
        'delivered'
      );

      expect(updatedMessage).toBeNull();
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

    it('should return count for specific conversation', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-023', testPhoneNumber, testSessionId, 'Message 1'),
        createInboundMessage(testTenantId, 'msg-024', '+5599999999999', testSessionId, 'Message 2'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const count = await messageService.getMessageCount(testTenantId, testPhoneNumber, testSessionId);

      expect(count).toBe(1);
    });
  });

  describe('deleteConversationMessages', () => {
    it('should delete all messages for conversation', async () => {
      const messages = [
        createInboundMessage(testTenantId, 'msg-025', testPhoneNumber, testSessionId, 'Message 1'),
        createInboundMessage(testTenantId, 'msg-026', testPhoneNumber, testSessionId, 'Message 2'),
        createInboundMessage(testTenantId, 'msg-027', '+5599999999999', testSessionId, 'Message 3'),
      ];

      for (const msg of messages) {
        await messageService.saveMessage(msg);
      }

      const deletedCount = await messageService.deleteConversationMessages(
        testTenantId,
        testPhoneNumber,
        testSessionId
      );

      expect(deletedCount).toBe(2);

      const remainingMessages = await messageService.getMessagesByTenant(testTenantId);
      expect(remainingMessages).toHaveLength(1);
      expect(remainingMessages[0].from).toBe('+5599999999999');
    });

    it('should return 0 for non-existent conversation', async () => {
      const deletedCount = await messageService.deleteConversationMessages(
        testTenantId,
        'non-existent',
        testSessionId
      );

      expect(deletedCount).toBe(0);
    });
  });
});
