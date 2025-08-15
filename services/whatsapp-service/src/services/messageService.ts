import { Collection } from 'mongodb';
import { logger } from '../config/logger.js';
import { getDb } from '../db/mongo.js';
import { Message, validateMessage } from '../models/Message.js';

export class MessageService {
  private get collection(): Collection<Message> {
    return getDb().collection<Message>('messages');
  }

  /**
   * Save a new message
   */
  async saveMessage(message: Omit<Message, '_id'>): Promise<Message> {
    try {
      const messageToSave = {
        ...message,
        timestamps: message.timestamps || {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await this.collection.insertOne(messageToSave as Message);

      if (!result.insertedId) {
        throw new Error('Failed to insert message');
      }

      const savedMessage = await this.collection.findOne({ _id: result.insertedId });

      if (!savedMessage) {
        throw new Error('Failed to retrieve saved message');
      }

      logger.info({
        msg: 'Message saved successfully',
        tenantId: message.tenant_id,
        messageId: message.messageId,
        direction: message.direction,
      });

      return validateMessage(savedMessage);
    } catch (error) {
      logger.error({
        msg: 'Failed to save message',
        tenantId: message.tenant_id,
        messageId: message.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }  /**
   * Get message by ID and tenant
   */
  async getMessage(tenantId: string, messageId: string): Promise<Message | null> {
    try {
      const message = await this.collection.findOne({
        tenant_id: tenantId,
        messageId,
      });

      if (message) {
        return validateMessage(message);
      }

      return null;
    } catch (error) {
      logger.error({
        msg: 'Failed to get message',
        tenantId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    tenantId: string,
    from: string,
    to: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const messages = await this.collection
        .find({
          tenant_id: tenantId,
          $or: [
            { from, to },
            { from: to, to: from }
          ]
        })
        .sort({ 'timestamps.createdAt': -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      return messages.map(message => validateMessage(message));
    } catch (error) {
      logger.error({
        msg: 'Failed to get conversation messages',
        tenantId,
        from,
        to,
        limit,
        offset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }  /**
   * Get messages by tenant with pagination
   */
  async getMessagesByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0,
    direction?: Message['direction']
  ): Promise<Message[]> {
    try {
      const filter: { tenant_id: string; direction?: Message['direction'] } = { tenant_id: tenantId };

      if (direction) {
        filter.direction = direction;
      }

      const messages = await this.collection
        .find(filter)
        .sort({ 'timestamps.createdAt': -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      return messages.map(message => validateMessage(message));
    } catch (error) {
      logger.error({
        msg: 'Failed to get messages by tenant',
        tenantId,
        limit,
        offset,
        direction,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get conversations (unique from/to pairs) for a tenant
   */
  async getConversations(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ conversationId: string; lastMessage: Message; messageCount: number }[]> {
    try {
      const pipeline = [
        { $match: { tenant_id: tenantId } },
        {
          $addFields: {
            conversationId: {
              $concat: [
                { $cond: [{ $lt: ['$from', '$to'] }, '$from', '$to'] },
                ':',
                { $cond: [{ $lt: ['$from', '$to'] }, '$to', '$from'] }
              ]
            }
          }
        },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $first: '$$ROOT' },
            messageCount: { $sum: 1 },
          },
        },
        { $sort: { 'lastMessage.timestamps.createdAt': -1 } },
        { $skip: offset },
        { $limit: limit },
      ];

      const conversations = await this.collection.aggregate(pipeline).toArray();

      return conversations.map(conv => ({
        conversationId: conv._id,
        lastMessage: validateMessage(conv.lastMessage),
        messageCount: conv.messageCount,
      }));
    } catch (error) {
      logger.error({
        msg: 'Failed to get conversations',
        tenantId,
        limit,
        offset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    tenantId: string,
    messageId: string,
    status: NonNullable<Message['status']>
  ): Promise<Message | null> {
    try {
      const now = new Date();
      const updateFields: Record<string, Date | string> = {
        status,
        'timestamps.updatedAt': now
      };

      // Set specific timestamp based on status
      switch (status) {
        case 'sent':
          updateFields['timestamps.sentAt'] = now;
          break;
        case 'delivered':
          updateFields['timestamps.deliveredAt'] = now;
          break;
        case 'read':
          updateFields['timestamps.readAt'] = now;
          break;
      }

      const result = await this.collection.findOneAndUpdate(
        { tenant_id: tenantId, messageId },
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      if (!result) {
        return null;
      }

      logger.info({
        msg: 'Message status updated',
        tenantId,
        messageId,
        status,
      });

      return validateMessage(result);
    } catch (error) {
      logger.error({
        msg: 'Failed to update message status',
        tenantId,
        messageId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get message count for a tenant
   */
  async getMessageCount(tenantId: string, from?: string, to?: string): Promise<number> {
    try {
      const filter: { tenant_id: string; $or?: Array<{ from: string; to: string }> } = { tenant_id: tenantId };

      if (from && to) {
        filter.$or = [
          { from, to },
          { from: to, to: from }
        ];
      }

      return await this.collection.countDocuments(filter);
    } catch (error) {
      logger.error({
        msg: 'Failed to get message count',
        tenantId,
        from,
        to,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }  /**
   * Delete messages for a conversation
   */
  async deleteConversationMessages(
    tenantId: string,
    from: string,
    to: string
  ): Promise<number> {
    try {
      const result = await this.collection.deleteMany({
        tenant_id: tenantId,
        $or: [
          { from, to },
          { from: to, to: from }
        ]
      });

      logger.info({
        msg: 'Conversation messages deleted',
        tenantId,
        from,
        to,
        deletedCount: result.deletedCount,
      });

      return result.deletedCount;
    } catch (error) {
      logger.error({
        msg: 'Failed to delete conversation messages',
        tenantId,
        from,
        to,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Singleton instance
export const messageService = new MessageService();
