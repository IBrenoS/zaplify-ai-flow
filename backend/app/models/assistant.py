"""
Pydantic models for Assistant entity
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class PersonalityType(str, Enum):
    """Available personality types for assistants"""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    ENTHUSIASTIC = "enthusiastic"
    EXPERT = "expert"


class AssistantObjective(str, Enum):
    """Available objectives for assistants"""
    QUALIFY_LEADS = "qualify_leads"
    SCHEDULE_MEETINGS = "schedule_meetings"
    SALES = "sales"
    SUPPORT = "support"
    CAPTURE_DATA = "capture_data"


class AssistantBase(BaseModel):
    """Base assistant model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    personality: Optional[PersonalityType] = PersonalityType.FRIENDLY
    voice_tone: Optional[str] = Field(None, max_length=50)
    objectives: Optional[List[AssistantObjective]] = []
    knowledge_base: Optional[List[str]] = []
    whatsapp_phone: Optional[str] = Field(None, regex=r"^\+[1-9]\d{1,14}$")


class AssistantCreate(AssistantBase):
    """Model for creating a new assistant"""
    # Additional fields for creation
    personality_instructions: Optional[str] = Field(None, max_length=2000)
    can_schedule: bool = False
    can_sell: bool = False
    can_qualify: bool = True
    can_capture_data: bool = True

    # Advanced settings
    formality_level: int = Field(5, ge=1, le=10)
    detail_level: int = Field(5, ge=1, le=10)
    emoji_usage: int = Field(3, ge=1, le=10)

    # Business context
    product_service: Optional[str] = Field(None, max_length=500)
    main_benefits: Optional[str] = Field(None, max_length=1000)
    target_audience: Optional[str] = Field(None, max_length=500)
    competitive_differentials: Optional[str] = Field(None, max_length=1000)
    products_and_prices: Optional[str] = Field(None, max_length=1000)
    payment_link: Optional[str] = Field(None, max_length=200)


class AssistantUpdate(BaseModel):
    """Model for updating an assistant"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    personality: Optional[PersonalityType] = None
    voice_tone: Optional[str] = Field(None, max_length=50)
    objectives: Optional[List[AssistantObjective]] = None
    knowledge_base: Optional[List[str]] = None
    whatsapp_phone: Optional[str] = Field(None, regex=r"^\+[1-9]\d{1,14}$")
    advanced_settings: Optional[Dict[str, Any]] = None


class AssistantResponse(AssistantBase):
    """Model for assistant responses"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    advanced_settings: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AssistantStats(BaseModel):
    """Assistant statistics model"""
    total_conversations: int = 0
    active_conversations: int = 0
    conversion_rate: float = 0.0
    avg_response_time: float = 0.0
    last_activity: Optional[datetime] = None


class AssistantWithStats(AssistantResponse):
    """Assistant with statistics"""
    stats: AssistantStats
