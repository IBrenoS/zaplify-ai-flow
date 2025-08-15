"""
Event schemas for Kafka integration
"""

from datetime import datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EventEnvelope(BaseModel):
    """Standard event envelope format for the ecosystem"""

    event_name: str = Field(..., description="Name of the event")
    version: str = Field(default="1.0", description="Event schema version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Event timestamp"
    )
    tenant_id: str = Field(..., description="Tenant identifier")
    correlation_id: str = Field(
        default_factory=lambda: str(uuid4()), description="Request correlation ID"
    )
    source: str = Field(default="ia-conversational", description="Source service")
    data: dict[str, Any] = Field(..., description="Event payload data")


class MessageReceivedEventData(BaseModel):
    """Data payload for message received events"""

    conversation_id: str = Field(..., description="Conversation identifier")
    message_id: str = Field(..., description="Message identifier")
    text: str = Field(..., description="Message text content")
    user_id: str | None = Field(None, description="User identifier")
    assistant_id: str = Field(..., description="Assistant identifier")
    channel: str | None = Field(
        None, description="Communication channel (whatsapp, web, etc.)"
    )
    meta: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )


class MessageReceivedEvent(EventEnvelope):
    """Complete message received event"""

    event_name: str = Field(
        default="conversation.message_received", description="Event name"
    )
    data: MessageReceivedEventData = Field(..., description="Message received data")


class MessageGeneratedEventData(BaseModel):
    """Data payload for message generated events"""

    conversation_id: str = Field(..., description="Conversation identifier")
    message_id: str = Field(..., description="Generated message identifier")
    text: str = Field(..., description="Generated response text")
    assistant_id: str = Field(..., description="Assistant identifier")
    processing_time_ms: int | None = Field(
        None, description="Processing time in milliseconds"
    )
    tokens_used: int | None = Field(None, description="Number of tokens used")
    model_name: str | None = Field(None, description="LLM model used")
    has_historical_context: bool = Field(
        default=False, description="Whether historical context was used"
    )
    meta: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )


class MessageGeneratedEvent(EventEnvelope):
    """Complete message generated event"""

    event_name: str = Field(
        default="conversation.message_generated", description="Event name"
    )
    data: MessageGeneratedEventData = Field(..., description="Message generated data")


class KafkaEventMessage(BaseModel):
    """Internal representation for Kafka message processing"""

    topic: str = Field(..., description="Kafka topic")
    key: str | None = Field(None, description="Message key")
    value: str = Field(..., description="JSON message value")
    headers: dict[str, str] | None = Field(None, description="Message headers")
    partition: int | None = Field(None, description="Topic partition")
    offset: int | None = Field(None, description="Message offset")
    timestamp: datetime | None = Field(None, description="Message timestamp")
