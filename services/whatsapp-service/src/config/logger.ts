import pino from 'pino';
import { config } from './env.js';

// Configuração do Pino logger
export const logger = pino({
  name: 'whatsapp-service',
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(config.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss Z',
      },
    },
  }),
});

// Helper para criar child logger com contexto
export function createChildLogger(context: { tenant_id?: string; correlation_id?: string }) {
  return logger.child(context);
}
