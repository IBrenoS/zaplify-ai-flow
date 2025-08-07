"""
Pydantic models for Conversation and Message entities
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class MessageSender(str, Enum):
    """Message sender types"""
    USER = "user"
    ASSISTANT = "assistant"
    HUMAN = "human"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    """Conversation status types"""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    TRANSFERRED = "transferred"
    ARCHIVED = "archived"


class MessageType(str, Enum):
    """Message types"""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    DOCUMENT = "document"
    LOCATION = "location"
    CONTACT = "contact"


class MessageBase(BaseModel):
    """Base message model"""
    content: str = Field(..., min_length=1, max_length=4000)
    sender: MessageSender
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = {}


class MessageCreate(MessageBase):
    """Model for creating a new message"""
    conversation_id: str
    # Additional fields for AI processing
    context: Optional[Dict[str, Any]] = {}
    requires_ai_response: bool = True


class MessageResponse(MessageBase):
    """Model for message responses"""
    id: str
    conversation_id: str
    timestamp: datetime
    is_read: bool = False
    ai_confidence: Optional[float] = None
    processing_time: Optional[float] = None

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    """Base conversation model"""
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, regex=r"^\+[1-9]\d{1,14}$")
    customer_email: Optional[str] = Field(None, max_length=100)
    platform: str = Field("whatsapp", max_length=50)
    status: ConversationStatus = ConversationStatus.ACTIVE


class ConversationCreate(ConversationBase):
    """Model for creating a new conversation"""
    assistant_id: str
    initial_message: Optional[str] = None


class ConversationUpdate(BaseModel):
    """Model for updating a conversation"""
    status: Optional[ConversationStatus] = None
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, regex=r"^\+[1-9]\d{1,14}$")
    customer_email: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)


class ConversationResponse(ConversationBase):
    """Model for conversation responses"""
    id: str
    assistant_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    message_count: int = 0

    class Config:
        from_attributes = True


class ConversationWithMessages(ConversationResponse):
    """Conversation with messages"""
    messages: List[MessageResponse] = []
    assistant_name: Optional[str] = None


class ConversationSummary(BaseModel):
    """Conversation summary for analytics"""
    id: str
    customer_name: Optional[str]
    status: ConversationStatus
    message_count: int
    created_at: datetime
    last_message_at: Optional[datetime]
    duration_minutes: Optional[int]
    ai_handoff_count: int = 0
