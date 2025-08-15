"""
Kafka integration for event-driven conversation processing
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import Any
from uuid import uuid4

try:
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    from aiokafka.errors import KafkaError

    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    AIOKafkaProducer = None
    AIOKafkaConsumer = None
    KafkaError = Exception

from app.config import Config
from app.core.logging import log_error, log_info
from app.core.redis import redis_service

from .schemas import (
    MessageGeneratedEvent,
    MessageGeneratedEventData,
    MessageReceivedEvent,
    MessageReceivedEventData,
)


class KafkaManager:
    """
    Manages Kafka producer and consumer for event-driven conversation processing
    """

    def __init__(self):
        self.config = Config()
        self.producer: Any | None = None
        self.consumer: Any | None = None
        self.running = False
        self._deduplication_ttl = 3600  # 1 hour TTL for message deduplication

    async def start(self) -> None:
        """Initialize Kafka producer and consumer"""
        if not self.config.ENABLE_KAFKA:
            log_info("Kafka integration disabled (ENABLE_KAFKA=false)")
            return

        if not KAFKA_AVAILABLE:
            log_error("Kafka integration enabled but aiokafka not available")
            return

        try:
            # Initialize producer
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.config.KAFKA_BROKER,
                value_serializer=lambda x: json.dumps(x).encode("utf-8"),
                enable_idempotence=True,
                acks="all",
                retries=3,
            )
            await self.producer.start()
            log_info(f"Kafka producer started - broker: {self.config.KAFKA_BROKER}")

            # Initialize consumer
            self.consumer = AIOKafkaConsumer(
                self.config.KAFKA_MESSAGE_RECEIVED_TOPIC,
                bootstrap_servers=self.config.KAFKA_BROKER,
                group_id=self.config.KAFKA_CONSUMER_GROUP,
                auto_offset_reset="latest",
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                enable_auto_commit=True,
            )
            await self.consumer.start()
            log_info(
                f"Kafka consumer started - topic: {self.config.KAFKA_MESSAGE_RECEIVED_TOPIC}"
            )

            self.running = True

        except Exception as e:
            log_error(f"Failed to start Kafka manager: {e}")
            await self.stop()
            raise

    async def stop(self) -> None:
        """Stop Kafka producer and consumer"""
        self.running = False

        if self.producer:
            try:
                await self.producer.stop()
                log_info("Kafka producer stopped")
            except Exception as e:
                log_error(f"Error stopping Kafka producer: {e}")

        if self.consumer:
            try:
                await self.consumer.stop()
                log_info("Kafka consumer stopped")
            except Exception as e:
                log_error(f"Error stopping Kafka consumer: {e}")

    async def publish_message_generated(
        self,
        conversation_id: str,
        message_id: str,
        text: str,
        assistant_id: str,
        tenant_id: str,
        correlation_id: str,
        processing_time_ms: int | None = None,
        tokens_used: int | None = None,
        model_name: str | None = None,
        has_historical_context: bool = False,
        meta: dict[str, Any] | None = None,
    ) -> bool:
        """
        Publish a message generated event to Kafka

        Args:
            conversation_id: Conversation identifier
            message_id: Generated message identifier
            text: Generated response text
            assistant_id: Assistant identifier
            tenant_id: Tenant identifier
            correlation_id: Request correlation ID
            processing_time_ms: Processing time in milliseconds
            tokens_used: Number of tokens used
            model_name: LLM model used
            has_historical_context: Whether historical context was used
            meta: Additional metadata

        Returns:
            bool: True if published successfully, False otherwise
        """
        if not self.config.ENABLE_KAFKA or not self.producer:
            return True  # No-op when disabled

        try:
            event_data = MessageGeneratedEventData(
                conversation_id=conversation_id,
                message_id=message_id,
                text=text,
                assistant_id=assistant_id,
                processing_time_ms=processing_time_ms,
                tokens_used=tokens_used,
                model_name=model_name,
                has_historical_context=has_historical_context,
                meta=meta or {},
            )

            event = MessageGeneratedEvent(
                tenant_id=tenant_id, correlation_id=correlation_id, data=event_data
            )

            # Send to Kafka
            await self.producer.send_and_wait(
                self.config.KAFKA_MESSAGE_GENERATED_TOPIC,
                value=event.dict(),
                key=conversation_id.encode("utf-8"),
            )

            log_info(
                "Published message generated event",
                event_name="conversation.message_generated",
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                conversation_id=conversation_id,
                message_id=message_id,
                assistant_id=assistant_id,
            )

            return True

        except Exception as e:
            log_error(
                f"Failed to publish message generated event: {e}",
                event_name="conversation.message_generated",
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                conversation_id=conversation_id,
                status="error",
            )
            return False

    async def _is_duplicate_message(self, message_id: str, tenant_id: str) -> bool:
        """
        Check if message has already been processed (simple deduplication)

        Args:
            message_id: Message identifier
            tenant_id: Tenant identifier

        Returns:
            bool: True if message is duplicate, False otherwise
        """
        try:
            key = f"kafka_dedup:{tenant_id}:{message_id}"
            exists = redis_service.exists(key)

            if exists:
                return True

            # Mark as processed with TTL
            redis_service.setex(key, self._deduplication_ttl, "1")
            return False

        except Exception as e:
            log_error(f"Deduplication check failed: {e}")
            return False  # Allow processing if Redis is unavailable

    async def _process_conversation_internal(
        self,
        assistant_id: str,
        message: str,
        conversation_id: str,
        tenant_id: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        """
        Internal conversation processing that replicates the conversation endpoint logic

        Args:
            assistant_id: Assistant identifier
            message: User message
            conversation_id: Conversation identifier
            tenant_id: Tenant identifier
            correlation_id: Request correlation ID

        Returns:
            Dict containing response data
        """
        from app.api.assistants import get_tenant_storage
        from app.api.conversation import _build_context_prompt
        from app.schemas.assistant import AssistantConfig
        from app.services.llm_service import llm_service
        from app.services.memory_service import memory_service

        # Load assistant configuration
        tenant_storage = get_tenant_storage(tenant_id)

        if assistant_id not in tenant_storage:
            raise ValueError(f"Assistant not found: {assistant_id}")

        config_data = tenant_storage[assistant_id]
        assistant_config = AssistantConfig(**config_data)

        # Append user turn to memory
        await memory_service.append_turn(
            conversation_id=conversation_id,
            role="user",
            text=message,
            tenant_id=tenant_id,
        )

        # Get conversation context for prompt building
        context = await memory_service.get_context(
            conversation_id=conversation_id, tenant_id=tenant_id
        )

        # Build enhanced prompt with personality, objectives, KB brief, and context
        enhanced_message = await _build_context_prompt(
            user_message=message,
            assistant_config=assistant_config,
            context=context,
            tenant_id=tenant_id,
        )

        # Generate reply using LLM service
        reply = await llm_service.generate_reply(
            text=enhanced_message,
            assistant_config=assistant_config,
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )

        # Generate message ID for response
        response_message_id = str(uuid4())

        # Append assistant turn to memory
        await memory_service.append_turn(
            conversation_id=conversation_id,
            role="assistant",
            text=reply,
            tenant_id=tenant_id,
        )

        return {
            "messageId": response_message_id,
            "text": reply,
            "assistant_id": assistant_id,
            "conversation_id": conversation_id,
            "tokensUsed": getattr(llm_service, "last_tokens_used", None),
            "modelName": getattr(llm_service, "last_model_name", None),
            "hasHistoricalContext": context.get("has_historical_context", False),
        }

    async def _process_message_received(self, event: MessageReceivedEvent) -> None:
        """
        Process a received message event by generating a conversation response

        Args:
            event: Message received event
        """
        data = event.data

        try:
            # Check for duplicate processing
            if await self._is_duplicate_message(data.message_id, event.tenant_id):
                log_info(
                    "Skipping duplicate message",
                    event_name="conversation.message_received",
                    tenant_id=event.tenant_id,
                    correlation_id=event.correlation_id,
                    message_id=data.message_id,
                )
                return

            # Process conversation internally
            start_time = time.time()

            response = await self._process_conversation_internal(
                assistant_id=data.assistant_id,
                message=data.text,
                conversation_id=data.conversation_id,
                tenant_id=event.tenant_id,
                correlation_id=event.correlation_id,
            )

            processing_time_ms = int((time.time() - start_time) * 1000)

            # Publish generated message event
            await self.publish_message_generated(
                conversation_id=data.conversation_id,
                message_id=response["messageId"],
                text=response["text"],
                assistant_id=data.assistant_id,
                tenant_id=event.tenant_id,
                correlation_id=event.correlation_id,
                processing_time_ms=processing_time_ms,
                tokens_used=response.get("tokensUsed"),
                model_name=response.get("modelName"),
                has_historical_context=response.get("hasHistoricalContext", False),
                meta={
                    "channel": data.channel,
                    "original_message_id": data.message_id,
                    "user_id": data.user_id,
                },
            )

            log_info(
                "Processed message received event",
                event_name="conversation.message_received",
                tenant_id=event.tenant_id,
                correlation_id=event.correlation_id,
                conversation_id=data.conversation_id,
                message_id=data.message_id,
                processing_time_ms=processing_time_ms,
                status="success",
            )

        except Exception as e:
            log_error(
                f"Failed to process message received event: {e}",
                event_name="conversation.message_received",
                tenant_id=event.tenant_id,
                correlation_id=event.correlation_id,
                conversation_id=data.conversation_id,
                message_id=data.message_id,
                status="error",
            )

    async def consume_messages(self) -> None:
        """
        Main consumer loop to process incoming message events
        """
        if not self.config.ENABLE_KAFKA or not self.consumer:
            log_info("Kafka consumer disabled or not available")
            return

        log_info("Starting Kafka message consumption")

        try:
            while self.running:
                try:
                    # Consume messages with timeout
                    async for message in self.consumer:
                        if not self.running:
                            break

                        try:
                            # Parse event envelope
                            event_data = message.value
                            event = MessageReceivedEvent(**event_data)

                            log_info(
                                "Received message event",
                                event_name=event.event_name,
                                tenant_id=event.tenant_id,
                                correlation_id=event.correlation_id,
                                topic=message.topic,
                                partition=message.partition,
                                offset=message.offset,
                            )

                            # Process the message
                            await self._process_message_received(event)

                        except Exception as e:
                            log_error(
                                f"Error processing Kafka message: {e}",
                                topic=message.topic,
                                partition=message.partition,
                                offset=message.offset,
                            )

                except asyncio.CancelledError:
                    log_info("Kafka consumer cancelled")
                    break
                except Exception as e:
                    log_error(f"Kafka consumer error: {e}")
                    await asyncio.sleep(5)  # Wait before retrying

        except Exception as e:
            log_error(f"Fatal error in Kafka consumer: {e}")
        finally:
            log_info("Kafka message consumption stopped")

    @asynccontextmanager
    async def lifespan_context(self):
        """Context manager for application lifespan"""
        try:
            await self.start()
            yield self
        finally:
            await self.stop()


# Global Kafka manager instance
kafka_manager = KafkaManager()


class MockKafkaManager:
    """
    Mock Kafka manager for testing without a real broker
    """

    def __init__(self):
        self.published_events: list[dict[str, Any]] = []
        self.consumed_events: list[dict[str, Any]] = []
        self.running = False

    async def start(self) -> None:
        """Mock start"""
        self.running = True
        log_info("Mock Kafka manager started")

    async def stop(self) -> None:
        """Mock stop"""
        self.running = False
        log_info("Mock Kafka manager stopped")

    async def publish_message_generated(self, **kwargs) -> bool:
        """Mock publish that stores events in memory"""
        event_data = MessageGeneratedEventData(
            **{
                k: v
                for k, v in kwargs.items()
                if k in MessageGeneratedEventData.__fields__
            }
        )

        event = MessageGeneratedEvent(
            tenant_id=kwargs.get("tenant_id", "test"),
            correlation_id=kwargs.get("correlation_id", "test"),
            data=event_data,
        )

        self.published_events.append(event.dict())

        log_info(
            "Mock published message generated event",
            event_name="conversation.message_generated",
            conversation_id=kwargs.get("conversation_id"),
            message_id=kwargs.get("message_id"),
        )

        return True

    async def simulate_message_received(self, **kwargs) -> None:
        """Simulate receiving a message for testing"""
        event_data = MessageReceivedEventData(
            **{
                k: v
                for k, v in kwargs.items()
                if k in MessageReceivedEventData.__fields__
            }
        )

        event = MessageReceivedEvent(
            tenant_id=kwargs.get("tenant_id", "test"),
            correlation_id=kwargs.get("correlation_id", "test"),
            data=event_data,
        )

        self.consumed_events.append(event.dict())

        # Process like real consumer would
        await kafka_manager._process_message_received(event)

    async def consume_messages(self) -> None:
        """Mock consumer - no-op"""
        pass

    @asynccontextmanager
    async def lifespan_context(self):
        """Mock context manager"""
        try:
            await self.start()
            yield self
        finally:
            await self.stop()


# Mock instance for testing
mock_kafka_manager = MockKafkaManager()
