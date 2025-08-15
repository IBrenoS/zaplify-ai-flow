import { Kafka, Producer } from 'kafkajs';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

interface EventEnvelope {
  event_name: 'conversation.message_received' | 'conversation.message_ack' | string;
  version: number;
  timestamp: string;
  tenant_id: string;
  correlation_id: string;
  source: string;
  data: {
    sessionId: string;
    from?: string;
    to?: string;
    messageId: string;
    text?: string;
    mediaUrls?: string[];
    status?: string;
    raw: unknown;
  };
}

class KafkaEventService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor() {
    if (config.ENABLE_KAFKA && config.KAFKA_BROKERS) {
      this.kafka = new Kafka({
        clientId: config.KAFKA_CLIENT_ID,
        brokers: config.KAFKA_BROKERS.split(','),
      });
      this.producer = this.kafka.producer();
    }
  }

  async connect(): Promise<void> {
    if (!this.producer || this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info({
        msg: 'Kafka producer connected successfully',
        clientId: config.KAFKA_CLIENT_ID,
        brokers: config.KAFKA_BROKERS,
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to connect Kafka producer',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async publishEvent(event: EventEnvelope): Promise<void> {
    if (!config.ENABLE_KAFKA) {
      logger.debug({
        msg: 'Kafka disabled, skipping event publication',
        event_name: event.event_name,
        correlation_id: event.correlation_id,
        tenant_id: event.tenant_id,
      });
      return;
    }

    if (!this.producer || !this.isConnected) {
      logger.warn({
        msg: 'Kafka producer not available, skipping event',
        event_name: event.event_name,
        correlation_id: event.correlation_id,
        tenant_id: event.tenant_id,
      });
      return;
    }

    try {
      const topic = event.event_name;
      const message = {
        key: `${event.tenant_id}:${event.data.messageId}`,
        value: JSON.stringify(event),
        headers: {
          'correlation-id': event.correlation_id,
          'tenant-id': event.tenant_id,
          'event-name': event.event_name,
          'source': event.source,
        },
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      logger.debug({
        msg: 'Event published to Kafka',
        event_name: event.event_name,
        topic,
        correlation_id: event.correlation_id,
        tenant_id: event.tenant_id,
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to publish event to Kafka',
        event_name: event.event_name,
        correlation_id: event.correlation_id,
        tenant_id: event.tenant_id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - webhook should still succeed even if Kafka fails
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info({
          msg: 'Kafka producer disconnected',
        });
      } catch (error) {
        logger.error({
          msg: 'Error disconnecting Kafka producer',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

// Singleton instance
const kafkaService = new KafkaEventService();

export { kafkaService, type EventEnvelope };
