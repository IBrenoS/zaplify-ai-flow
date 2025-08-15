export interface MessageData {
  id: string;
  from: string;
  to: string;
  text?: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url?: string;
    caption?: string;
  };
  timestamp: number;
  messageType: 'text' | 'media';
}

export interface WebhookPayload {
  messageId: string;
  sessionId: string;
  data: MessageData;
  event: 'message.received' | 'message.sent' | 'message.delivered';
}

export interface SendMessageRequest {
  to: string;
  text?: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    caption?: string;
  };
}

export interface SendMessageResponse {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: number;
}

export interface AppHeaders {
  'x-correlation-id': string;
  'x-tenant-id': string;
}

export interface RequestWithHeaders extends Request {
  correlationId: string;
  tenantId: string;
}
