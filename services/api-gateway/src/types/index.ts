export interface CorrelationContext {
  correlationId: string;
  tenantId: string;
}

export interface HealthStatus {
  ok: boolean;
  service: string;
  error?: string;
  responseTime?: number;
  mode?: 'real' | 'mock';
}

export interface DeepHealthResponse {
  ok: boolean;
  service: string;
  deps: {
    ia: HealthStatus;
    whatsapp: HealthStatus;
    funnel: HealthStatus;
    analytics: HealthStatus;
  };
  tenant_id: string;
  correlation_id: string;
  timestamp: string;
}

export interface LogEntry {
  service: string;
  tenant_id: string;
  correlation_id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  msg: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// JWT Authentication Types
export interface JWTPayload {
  sub: string; // User ID
  tenant_id?: string;
  scopes: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  scopes: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// API Response Types
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  correlation_id: string;
  tenant_id?: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  correlation_id?: string;
  tenant_id?: string;
  data?: any;
  timestamp?: string;
}

export interface WebSocketConnection {
  id: string;
  tenantId: string;
  correlationId: string;
  connectedAt: string;
  lastPing?: string;
}

export interface ExtendedWebSocket {
  // Propriedades do WebSocket nativo
  readyState: number;
  send(data: string): void;
  on(event: string, listener: (...args: any[]) => void): void;
  ping(): void;
  terminate(): void;

  // Propriedades customizadas
  id: string;
  tenantId: string;
  correlationId: string;
  connectedAt: string;
  isAlive: boolean;
  lastPing?: number;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      tenantId: string;
      user?: AuthenticatedUser;
    }
    interface Response {
      correlationId: string;
      tenantId: string;
    }
  }
}
