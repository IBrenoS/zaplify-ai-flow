import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectMongo, disconnectMongo } from '../src/db/mongo';
import { MessageService } from '../src/services/messageService';

describe('MessageService Simple Tests', () => {
  let mongod: MongoMemoryServer;
  let messageService: MessageService;

  beforeEach(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('MongoDB Memory Server started at:', uri);

    // Override the MONGODB_URI for testing
    process.env.MONGODB_URI = uri;

    // Connect to MongoDB
    await connectMongo();

    // Initialize the MessageService
    messageService = new MessageService();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await disconnectMongo();
    } catch {
      // Ignore disconnection errors
    }

    if (mongod) {
      await mongod.stop();
    }
  });

  // Helper function to add delay for timestamp differentiation
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  describe('getConversationMessages ordering', () => {
    it('should return messages in newest-first order', async () => {
      const baseTimestamp = new Date();

      // Create first message
      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-006',
        from: '+5511999887766',
        to: 'test-session-1',
        text: 'First message',
        direction: 'in',
        status: 'delivered',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime()),
          updatedAt: new Date(baseTimestamp.getTime())
        }
      });

      await delay(50); // 50ms delay

      // Create second message
      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-007',
        from: 'test-session-1',
        to: '+5511999887766',
        text: 'Second message',
        direction: 'out',
        status: 'sent',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime() + 50),
          updatedAt: new Date(baseTimestamp.getTime() + 50)
        }
      });

      await delay(50); // 50ms delay

      // Create third message
      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-008',
        from: '+5511999887766',
        to: 'test-session-1',
        text: 'Third message',
        direction: 'in',
        status: 'delivered',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime() + 100),
          updatedAt: new Date(baseTimestamp.getTime() + 100)
        }
      });

      const conversationMessages = await messageService.getConversationMessages(
        'test-tenant-1',
        '+5511999887766',
        'test-session-1'
      );

      expect(conversationMessages).toHaveLength(3);
      // Should be ordered by creation time (newest first)
      expect(conversationMessages[0].text).toBe('Third message');
      expect(conversationMessages[1].text).toBe('Second message');
      expect(conversationMessages[2].text).toBe('First message');
    });

    it('should respect pagination with proper ordering', async () => {
      const baseTimestamp = new Date();

      // Create messages with clear timestamp differences
      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-009',
        from: '+5511999887766',
        to: 'test-session-1',
        text: 'First message',
        direction: 'in',
        status: 'delivered',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime()),
          updatedAt: new Date(baseTimestamp.getTime())
        }
      });

      await delay(50);

      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-010',
        from: '+5511999887766',
        to: 'test-session-1',
        text: 'Second message',
        direction: 'in',
        status: 'delivered',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime() + 50),
          updatedAt: new Date(baseTimestamp.getTime() + 50)
        }
      });

      await delay(50);

      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-011',
        from: '+5511999887766',
        to: 'test-session-1',
        text: 'Third message',
        direction: 'in',
        status: 'delivered',
        timestamps: {
          createdAt: new Date(baseTimestamp.getTime() + 100),
          updatedAt: new Date(baseTimestamp.getTime() + 100)
        }
      });

      const firstPage = await messageService.getConversationMessages(
        'test-tenant-1',
        '+5511999887766',
        'test-session-1',
        2, // limit
        0  // offset
      );

      expect(firstPage).toHaveLength(2);
      expect(firstPage[0].text).toBe('Third message');
      expect(firstPage[1].text).toBe('Second message');

      const secondPage = await messageService.getConversationMessages(
        'test-tenant-1',
        '+5511999887766',
        'test-session-1',
        2, // limit
        2  // offset
      );

      expect(secondPage).toHaveLength(1);
      expect(secondPage[0].text).toBe('First message');
    });
  });

  describe('updateMessageStatus', () => {
    it('should set deliveredAt timestamp when status is delivered', async () => {
      const baseTimestamp = new Date();

      await messageService.saveMessage({
        tenant_id: 'test-tenant-1',
        messageId: 'msg-019',
        from: 'test-session-1',
        to: '+5511999887766',
        text: 'Test outbound message',
        direction: 'out',
        status: 'sent',
        timestamps: {
          createdAt: baseTimestamp,
          updatedAt: baseTimestamp
        }
      });

      const updatedMessage = await messageService.updateMessageStatus(
        'test-tenant-1',
        'msg-019',
        'delivered'
      );

      expect(updatedMessage).not.toBeNull();
      expect(updatedMessage?.status).toBe('delivered');
      expect(updatedMessage?.timestamps.deliveredAt).toBeDefined();
      expect(updatedMessage?.timestamps.deliveredAt).toBeInstanceOf(Date);
    });
  });
});
