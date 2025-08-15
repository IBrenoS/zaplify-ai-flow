import type { LogEntry } from '../types/index.js';

class Logger {
  private serviceName = 'api-gateway';

  private createLogEntry(
    level: LogEntry['level'],
    msg: string,
    tenantId: string = 'default',
    correlationId: string = 'unknown',
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      service: this.serviceName,
      tenant_id: tenantId,
      correlation_id: correlationId,
      level,
      msg,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata })
    };
  }

  info(msg: string, tenantId?: string, correlationId?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('info', msg, tenantId, correlationId, metadata);
    console.log(JSON.stringify(entry));
  }

  warn(msg: string, tenantId?: string, correlationId?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', msg, tenantId, correlationId, metadata);
    console.warn(JSON.stringify(entry));
  }

  error(msg: string, tenantId?: string, correlationId?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', msg, tenantId, correlationId, metadata);
    console.error(JSON.stringify(entry));
  }

  debug(msg: string, tenantId?: string, correlationId?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', msg, tenantId, correlationId, metadata);
    console.debug(JSON.stringify(entry));
  }
}

export const logger = new Logger();
