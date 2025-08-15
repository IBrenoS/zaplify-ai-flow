"""
Tests for Kafka event integration (Prompt 11)
"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.config import Config
from app.events.kafka import (
    KafkaManager,
    MockKafkaManager,
    kafka_manager,
)
from app.events.schemas import (
    EventEnvelope,
    MessageGeneratedEvent,
    MessageGeneratedEventData,
    MessageReceivedEvent,
    MessageReceivedEventData,
)


class TestEventSchemas:
    """Test event schema validation and serialization"""

    def test_event_envelope_creation(self):
        """Test basic event envelope creation"""
        envelope = EventEnvelope(
            event_name="test.event", tenant_id="test-tenant", data={"key": "value"}
        )

        assert envelope.event_name == "test.event"
        assert envelope.tenant_id == "test-tenant"
        assert envelope.version == "1.0"
        assert envelope.source == "ia-conversational"
        assert envelope.data == {"key": "value"}
        assert isinstance(envelope.timestamp, datetime)
        assert isinstance(envelope.correlation_id, str)

    def test_message_received_event(self):
        """Test message received event structure"""
        event = MessageReceivedEvent(
            tenant_id="test-tenant",
            correlation_id="test-correlation",
            data=MessageReceivedEventData(
                conversation_id="conv-123",
                message_id="msg-456",
                text="Hello assistant",
                assistant_id="asst-789",
                channel="whatsapp",
                user_id="user-123",
            ),
        )

        assert event.event_name == "conversation.message_received"
        assert event.data.conversation_id == "conv-123"
        assert event.data.text == "Hello assistant"
        assert event.data.channel == "whatsapp"

    def test_message_generated_event(self):
        """Test message generated event structure"""
        event = MessageGeneratedEvent(
            tenant_id="test-tenant",
            correlation_id="test-correlation",
            data=MessageGeneratedEventData(
                conversation_id="conv-123",
                message_id="msg-789",
                text="Hello user",
                assistant_id="asst-789",
                processing_time_ms=150,
                tokens_used=25,
                model_name="gpt-4",
                has_historical_context=True,
            ),
        )

        assert event.event_name == "conversation.message_generated"
        assert event.data.processing_time_ms == 150
        assert event.data.tokens_used == 25
        assert event.data.has_historical_context is True


class TestKafkaManagerDisabled:
    """Test Kafka manager behavior when disabled"""

    def test_kafka_disabled_no_op(self):
        """Test that Kafka operations are no-op when disabled"""
        with patch.object(Config, "ENABLE_KAFKA", False):
            manager = KafkaManager()
            assert manager.config.ENABLE_KAFKA is False

    @pytest.mark.asyncio
    async def test_start_when_disabled(self):
        """Test start method when Kafka is disabled"""
        with patch.object(Config, "ENABLE_KAFKA", False):
            manager = KafkaManager()
            await manager.start()
            assert manager.producer is None
            assert manager.consumer is None
            assert manager.running is False

    @pytest.mark.asyncio
    async def test_publish_when_disabled(self):
        """Test publish returns True when disabled (no-op)"""
        with patch.object(Config, "ENABLE_KAFKA", False):
            manager = KafkaManager()
            result = await manager.publish_message_generated(
                conversation_id="test",
                message_id="test",
                text="test",
                assistant_id="test",
                tenant_id="test",
                correlation_id="test",
            )
            assert result is True


class TestKafkaManagerEnabled:
    """Test Kafka manager behavior when enabled but mocked"""

    @pytest.fixture
    def mock_kafka_components(self):
        """Mock aiokafka components"""
        with (
            patch("app.events.kafka.KAFKA_AVAILABLE", True),
            patch("app.events.kafka.AIOKafkaProducer") as mock_producer_class,
            patch("app.events.kafka.AIOKafkaConsumer") as mock_consumer_class,
        ):

            mock_producer = AsyncMock()
            mock_consumer = AsyncMock()

            mock_producer_class.return_value = mock_producer
            mock_consumer_class.return_value = mock_consumer

            yield {
                "producer_class": mock_producer_class,
                "consumer_class": mock_consumer_class,
                "producer": mock_producer,
                "consumer": mock_consumer,
            }

    @pytest.mark.asyncio
    async def test_start_when_enabled(self, mock_kafka_components):
        """Test start method when Kafka is enabled"""
        with patch.object(Config, "ENABLE_KAFKA", True):
            manager = KafkaManager()
            await manager.start()

            assert manager.producer is not None
            assert manager.consumer is not None
            assert manager.running is True

            # Verify Kafka components were started
            mock_kafka_components["producer"].start.assert_called_once()
            mock_kafka_components["consumer"].start.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_manager(self, mock_kafka_components):
        """Test stop method"""
        with patch.object(Config, "ENABLE_KAFKA", True):
            manager = KafkaManager()
            await manager.start()
            await manager.stop()

            assert manager.running is False

            # Verify Kafka components were stopped
            mock_kafka_components["producer"].stop.assert_called_once()
            mock_kafka_components["consumer"].stop.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_message_generated(self, mock_kafka_components):
        """Test publishing message generated event"""
        with patch.object(Config, "ENABLE_KAFKA", True):
            manager = KafkaManager()
            await manager.start()

            result = await manager.publish_message_generated(
                conversation_id="conv-123",
                message_id="msg-456",
                text="Generated response",
                assistant_id="asst-789",
                tenant_id="test-tenant",
                correlation_id="test-correlation",
                processing_time_ms=150,
                tokens_used=25,
                model_name="gpt-4",
                has_historical_context=True,
                meta={"channel": "whatsapp"},
            )

            assert result is True

            # Verify send_and_wait was called
            mock_kafka_components["producer"].send_and_wait.assert_called_once()

            # Check the call arguments
            call_args = mock_kafka_components["producer"].send_and_wait.call_args
            assert call_args[0][0] == manager.config.KAFKA_MESSAGE_GENERATED_TOPIC
            assert call_args[1]["key"] == b"conv-123"

            # Verify event structure
            event_data = call_args[1]["value"]
            assert event_data["event_name"] == "conversation.message_generated"
            assert event_data["data"]["conversation_id"] == "conv-123"
            assert event_data["data"]["text"] == "Generated response"

    @pytest.mark.asyncio
    async def test_deduplication(self):
        """Test message deduplication logic"""
        with patch("app.events.kafka.redis_service") as mock_redis:
            manager = KafkaManager()

            # Test new message (not duplicate)
            mock_redis.exists.return_value = False
            is_duplicate = await manager._is_duplicate_message("msg-123", "tenant-1")
            assert is_duplicate is False
            mock_redis.setex.assert_called_once_with(
                "kafka_dedup:tenant-1:msg-123", 3600, "1"
            )

            # Test duplicate message
            mock_redis.exists.return_value = True
            is_duplicate = await manager._is_duplicate_message("msg-123", "tenant-1")
            assert is_duplicate is True


class TestMessageProcessing:
    """Test message processing logic"""

    @pytest.mark.asyncio
    async def test_process_conversation_internal(self):
        """Test internal conversation processing"""
        with (
            patch("app.api.assistants.get_tenant_storage") as mock_storage,
            patch("app.services.memory_service.memory_service") as mock_memory,
            patch("app.services.llm_service.llm_service") as mock_llm,
            patch("app.api.conversation._build_context_prompt") as mock_build_prompt,
        ):

            # Setup mocks
            mock_storage.return_value = {
                "asst-123": {
                    "id": "asst-123",
                    "name": "Test Assistant",
                    "personality": "helpful",
                    "objectives": ["help users"],
                }
            }

            mock_memory.append_turn = AsyncMock()
            mock_memory.get_context = AsyncMock(
                return_value={"turns": [], "has_history": False, "total_turns": 0}
            )

            mock_llm.generate_reply = AsyncMock(return_value="AI response")
            mock_build_prompt.return_value = "Enhanced prompt"

            manager = KafkaManager()

            result = await manager._process_conversation_internal(
                assistant_id="asst-123",
                message="Hello",
                conversation_id="conv-123",
                tenant_id="test-tenant",
                correlation_id="test-correlation",
            )

            assert result["text"] == "AI response"
            assert result["assistant_id"] == "asst-123"
            assert result["conversation_id"] == "conv-123"
            assert "messageId" in result

            # Verify service calls
            mock_memory.append_turn.assert_called()
            mock_llm.generate_reply.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_message_received_event(self):
        """Test processing of message received event"""
        with (
            patch.object(KafkaManager, "_is_duplicate_message", return_value=False),
            patch.object(
                KafkaManager, "_process_conversation_internal"
            ) as mock_process,
            patch.object(KafkaManager, "publish_message_generated") as mock_publish,
        ):

            mock_process.return_value = {
                "messageId": "response-123",
                "text": "AI response",
                "assistant_id": "asst-123",
                "conversation_id": "conv-123",
            }
            mock_publish.return_value = True

            manager = KafkaManager()

            event = MessageReceivedEvent(
                tenant_id="test-tenant",
                correlation_id="test-correlation",
                data=MessageReceivedEventData(
                    conversation_id="conv-123",
                    message_id="msg-456",
                    text="Hello assistant",
                    assistant_id="asst-123",
                ),
            )

            await manager._process_message_received(event)

            # Verify processing was called
            mock_process.assert_called_once_with(
                assistant_id="asst-123",
                message="Hello assistant",
                conversation_id="conv-123",
                tenant_id="test-tenant",
                correlation_id="test-correlation",
            )

            # Verify publish was called
            mock_publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_skip_duplicate_message(self):
        """Test that duplicate messages are skipped"""
        with (
            patch.object(KafkaManager, "_is_duplicate_message", return_value=True),
            patch.object(
                KafkaManager, "_process_conversation_internal"
            ) as mock_process,
        ):

            manager = KafkaManager()

            event = MessageReceivedEvent(
                tenant_id="test-tenant",
                correlation_id="test-correlation",
                data=MessageReceivedEventData(
                    conversation_id="conv-123",
                    message_id="msg-456",
                    text="Hello assistant",
                    assistant_id="asst-123",
                ),
            )

            await manager._process_message_received(event)

            # Verify processing was NOT called for duplicate
            mock_process.assert_not_called()


class TestMockKafkaManager:
    """Test mock Kafka manager for testing environments"""

    @pytest.mark.asyncio
    async def test_mock_start_stop(self):
        """Test mock manager start/stop"""
        manager = MockKafkaManager()

        await manager.start()
        assert manager.running is True

        await manager.stop()
        assert manager.running is False

    @pytest.mark.asyncio
    async def test_mock_publish(self):
        """Test mock publish stores events"""
        manager = MockKafkaManager()

        result = await manager.publish_message_generated(
            conversation_id="conv-123",
            message_id="msg-456",
            text="Test response",
            assistant_id="asst-789",
            tenant_id="test-tenant",
            correlation_id="test-correlation",
        )

        assert result is True
        assert len(manager.published_events) == 1

        event = manager.published_events[0]
        assert event["event_name"] == "conversation.message_generated"
        assert event["data"]["conversation_id"] == "conv-123"
        assert event["data"]["text"] == "Test response"

    @pytest.mark.asyncio
    async def test_mock_simulate_message_received(self):
        """Test mock simulation of received messages"""
        with patch.object(kafka_manager, "_process_message_received") as mock_process:
            manager = MockKafkaManager()

            await manager.simulate_message_received(
                conversation_id="conv-123",
                message_id="msg-456",
                text="Hello",
                assistant_id="asst-789",
                tenant_id="test-tenant",
                correlation_id="test-correlation",
            )

            assert len(manager.consumed_events) == 1
            mock_process.assert_called_once()


class TestKafkaIntegration:
    """Integration tests for Kafka event flow"""

    @pytest.mark.asyncio
    async def test_end_to_end_event_flow(self):
        """Test complete event flow: receive -> process -> publish"""
        with (
            patch("app.api.assistants.get_tenant_storage") as mock_storage,
            patch("app.services.memory_service.memory_service") as mock_memory,
            patch("app.services.llm_service.llm_service") as mock_llm,
            patch("app.api.conversation._build_context_prompt") as mock_build_prompt,
        ):

            # Setup mocks for conversation processing
            mock_storage.return_value = {
                "asst-123": {
                    "id": "asst-123",
                    "name": "Test Assistant",
                    "personality": "helpful",
                    "objectives": ["help users"],
                }
            }

            mock_memory.append_turn = AsyncMock()
            mock_memory.get_context = AsyncMock(
                return_value={"turns": [], "has_history": False, "total_turns": 0}
            )

            mock_llm.generate_reply = AsyncMock(return_value="AI response")
            mock_build_prompt.return_value = "Enhanced prompt"

            # Use mock manager for testing
            manager = MockKafkaManager()
            await manager.start()

            # Simulate message received event
            await manager.simulate_message_received(
                conversation_id="conv-123",
                message_id="msg-456",
                text="Hello assistant",
                assistant_id="asst-123",
                tenant_id="test-tenant",
                correlation_id="test-correlation",
            )

            # Verify events were processed
            assert len(manager.consumed_events) == 1

            consumed_event = manager.consumed_events[0]
            assert consumed_event["event_name"] == "conversation.message_received"
            assert consumed_event["data"]["text"] == "Hello assistant"

    @pytest.mark.asyncio
    async def test_kafka_failure_handling(self):
        """Test handling of Kafka failures"""
        with (
            patch.object(Config, "ENABLE_KAFKA", True),
            patch("app.events.kafka.AIOKafkaProducer") as mock_producer_class,
        ):

            # Simulate Kafka connection failure
            mock_producer = AsyncMock()
            mock_producer.start.side_effect = Exception("Connection failed")
            mock_producer_class.return_value = mock_producer

            manager = KafkaManager()

            with pytest.raises((ValueError, RuntimeError, ConnectionError)):
                await manager.start()

            assert manager.running is False

    def test_configuration_validation(self):
        """Test Kafka configuration validation"""
        config = Config()

        # Test default values
        assert config.KAFKA_BROKER == "redpanda:9092"
        assert config.KAFKA_CONSUMER_GROUP == "ia-conversational"
        assert config.KAFKA_MESSAGE_RECEIVED_TOPIC == "conversation.message_received"
        assert config.KAFKA_MESSAGE_GENERATED_TOPIC == "conversation.message_generated"


class TestEventEnvelopeStandard:
    """Test event envelope standard compliance"""

    def test_envelope_format_compliance(self):
        """Test that events comply with standard envelope format"""
        event = MessageGeneratedEvent(
            tenant_id="test-tenant",
            correlation_id="test-correlation",
            data=MessageGeneratedEventData(
                conversation_id="conv-123",
                message_id="msg-789",
                text="Response text",
                assistant_id="asst-123",
            ),
        )

        # Check envelope fields
        assert hasattr(event, "event_name")
        assert hasattr(event, "version")
        assert hasattr(event, "timestamp")
        assert hasattr(event, "tenant_id")
        assert hasattr(event, "correlation_id")
        assert hasattr(event, "source")
        assert hasattr(event, "data")

        # Check required values
        assert event.source == "ia-conversational"
        assert event.version == "1.0"
        assert isinstance(event.timestamp, datetime)

    def test_event_serialization(self):
        """Test event serialization to JSON"""
        event = MessageReceivedEvent(
            tenant_id="test-tenant",
            correlation_id="test-correlation",
            data=MessageReceivedEventData(
                conversation_id="conv-123",
                message_id="msg-456",
                text="Hello",
                assistant_id="asst-123",
            ),
        )

        # Test serialization
        event_dict = event.dict()
        json_str = json.dumps(event_dict, default=str)

        # Test deserialization
        parsed_data = json.loads(json_str)
        reconstructed_event = MessageReceivedEvent(**parsed_data)

        assert reconstructed_event.event_name == event.event_name
        assert reconstructed_event.data.conversation_id == event.data.conversation_id
