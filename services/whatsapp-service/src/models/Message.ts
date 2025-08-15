import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Zod schema for Message validation
export const MessageSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  tenant_id: z.string().min(1),
  direction: z.enum(['in', 'out']),
  messageId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  text: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional().nullable(),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']).optional(),
  timestamps: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    sentAt: z.date().optional(),
    deliveredAt: z.date().optional(),
    readAt: z.date().optional(),
  }),
});

// TypeScript interface
export interface Message {
  _id?: ObjectId;
  tenant_id: string;
  direction: 'in' | 'out';
  messageId: string;
  from: string;
  to: string;
  text?: string;
  mediaUrls?: string[] | null;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamps: {
    createdAt: Date;
    updatedAt: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
  };
}

// Helper function to create a new inbound message
export function createInboundMessage(
  tenantId: string,
  messageId: string,
  from: string,
  to: string,
  text?: string,
  mediaUrls?: string[]
): Message {
  const now = new Date();

  return {
    tenant_id: tenantId,
    direction: 'in',
    messageId,
    from,
    to,
    text,
    mediaUrls,
    status: 'delivered', // Inbound messages are already delivered
    timestamps: {
      createdAt: now,
      updatedAt: now,
      deliveredAt: now,
    },
  };
}

// Helper function to create a new outbound message
export function createOutboundMessage(
  tenantId: string,
  messageId: string,
  from: string,
  to: string,
  text?: string,
  mediaUrls?: string[]
): Message {
  const now = new Date();

  return {
    tenant_id: tenantId,
    direction: 'out',
    messageId,
    from,
    to,
    text,
    mediaUrls,
    status: 'pending',
    timestamps: {
      createdAt: now,
      updatedAt: now,
    },
  };
}

// Helper function to update message status
export function updateMessageStatus(
  message: Message,
  status: Message['status']
): Message {
  const now = new Date();
  const timestamps = { ...message.timestamps, updatedAt: now };

  // Add specific timestamp based on status
  switch (status) {
    case 'sent':
      timestamps.sentAt = now;
      break;
    case 'delivered':
      timestamps.deliveredAt = now;
      break;
    case 'read':
      timestamps.readAt = now;
      break;
  }

  return {
    ...message,
    status,
    timestamps,
  };
}

// Helper function to get conversation ID (normalized from/to pair)
export function getConversationId(from: string, to: string): string {
  // Normalize phone numbers by removing common prefixes and sorting
  const normalizePhone = (phone: string) => phone.replace(/^\+?55/, '').replace(/\D/g, '');
  const normFrom = normalizePhone(from);
  const normTo = normalizePhone(to);

  // Create consistent conversation ID regardless of direction
  return [normFrom, normTo].sort().join(':');
}

// Validation function
export function validateMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}

export function isValidMessageDirection(direction: string): direction is Message['direction'] {
  return ['in', 'out'].includes(direction);
}

export function isValidMessageStatus(status: string): status is NonNullable<Message['status']> {
  return ['pending', 'sent', 'delivered', 'read', 'failed'].includes(status);
}
