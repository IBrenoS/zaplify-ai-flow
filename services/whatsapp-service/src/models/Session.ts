import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Zod schema for Session validation
export const SessionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  tenant_id: z.string().min(1),
  sessionId: z.string().min(1),
  status: z.enum(['creating', 'open', 'connecting', 'close', 'destroyed']),
  phoneNumber: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript interface
export interface Session {
  _id?: ObjectId;
  tenant_id: string;
  sessionId: string;
  status: 'creating' | 'open' | 'connecting' | 'close' | 'destroyed';
  phoneNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to create a new session
export function createSession(
  tenantId: string,
  sessionId: string,
  status: Session['status'] = 'creating',
  phoneNumber?: string
): Session {
  const now = new Date();

  return {
    tenant_id: tenantId,
    sessionId,
    status,
    phoneNumber,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper function to update session
export function updateSession(
  session: Session,
  updates: Partial<Pick<Session, 'status' | 'phoneNumber'>>
): Session {
  return {
    ...session,
    ...updates,
    updatedAt: new Date(),
  };
}

// Validation function
export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

export function isValidSessionStatus(status: string): status is Session['status'] {
  return ['creating', 'open', 'connecting', 'close', 'destroyed'].includes(status);
}
