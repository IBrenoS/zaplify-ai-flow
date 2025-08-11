// Common types shared across all microservices
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    service: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'agent';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  fromId: string;
  toId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  metadata?: any;
}

export interface Conversation {
  id: string;
  participants: string[];
  status: 'active' | 'closed' | 'archived';
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface FunnelStep {
  id: string;
  name: string;
  type: 'message' | 'condition' | 'action' | 'delay' | 'webhook';
  config: any;
  nextSteps: string[];
  position: { x: number; y: number };
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  triggers: string[];
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIContext {
  conversationHistory: Message[];
  userProfile?: any;
  funnelContext?: any;
  businessContext?: any;
}
