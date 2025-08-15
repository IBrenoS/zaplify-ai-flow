"""
AssistantConfig and related schemas based on AssistantStudio.tsx
100% compatible with frontend schema with enhanced validations
"""

from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, validator


class PersonalityArchetype(str, Enum):
    """Personality archetypes from frontend - VALIDATED ENUM"""

    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    ENTHUSIASTIC = "enthusiastic"
    EXPERT = "expert"


class QuickResponse(BaseModel):
    """Quick response mapping"""

    trigger: str = Field(..., description="Trigger phrase")
    response: str = Field(..., description="Response text")


class KnowledgeSource(BaseModel):
    """Knowledge source configuration"""

    name: str
    type: str
    active: bool = True


class ExternalSources(BaseModel):
    """External sources configuration for enhanced responses"""

    previousConversations: bool = Field(
        False,
        description="Enable learning from previous conversations for better responses",
    )
    knowledgeBase: bool = Field(False, description="Enable knowledge base integration")


class AdvancedSettings(BaseModel):
    """Advanced assistant settings for security and compliance"""

    hardRules: list[str] = Field(
        default_factory=list,
        description="Unbreakable rules that the assistant must follow",
    )
    enableModeration: bool = Field(
        False, description="Enable content moderation for inputs and outputs"
    )
    enableAuditLogging: bool = Field(
        True, description="Enable audit logging for compliance"
    )
    enablePiiMasking: bool = Field(True, description="Enable PII masking in logs")


class AssistantConfig(BaseModel):
    """
    Complete assistant configuration matching frontend schema
    With enhanced validations for production use
    """

    # Identity fields
    id: str | None = None
    name: str = Field(..., description="Assistant name", min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)

    # Personality - VALIDATED ENUM
    selected_archetype: PersonalityArchetype | None = Field(
        None,
        description="Personality archetype: friendly, professional, enthusiastic, expert",
    )
    personality_instructions: str | None = Field(None, max_length=1000)

    # Objectives and capabilities - VALIDATED FLAGS
    objective: str | None = Field(None, max_length=500)
    can_schedule: bool = Field(False, description="Can schedule appointments")
    can_sell: bool = Field(False, description="Can handle sales processes")
    can_qualify: bool = Field(True, description="Can qualify leads - MUST BE TRUE")
    can_capture_data: bool = Field(True, description="Can capture data - MUST BE TRUE")

    # Knowledge and content
    product_service: str | None = Field(None, max_length=1000)
    main_benefits: str | None = Field(None, max_length=1000)
    target_audience: str | None = Field(None, max_length=500)
    competitive_differentials: str | None = Field(None, max_length=1000)
    products_and_prices: str | None = Field(None, max_length=2000)
    payment_link: HttpUrl | None = None

    # Advanced settings
    hard_rules: str | None = Field(None, max_length=1000)
    knowledge_sources: list[KnowledgeSource] = Field(default_factory=list)
    quick_responses: list[QuickResponse] = Field(default_factory=list)

    # External sources for enhanced responses - PROMPT 10
    externalSources: ExternalSources = Field(
        default_factory=ExternalSources,
        description="External sources configuration for learning from history and knowledge base",
    )

    # Advanced settings for security and compliance - PROMPT 12
    advancedSettings: AdvancedSettings = Field(
        default_factory=AdvancedSettings,
        description="Advanced security and compliance settings",
    )

    # Communication style - VALIDATED RANGES 1-10
    formality_level: int = Field(
        5, ge=1, le=10, description="Formality level (1=very casual, 10=very formal)"
    )
    detail_level: int = Field(
        5, ge=1, le=10, description="Detail level (1=very brief, 10=very detailed)"
    )
    emoji_usage: int = Field(
        3, ge=1, le=10, description="Emoji usage (1=none, 10=lots)"
    )

    # WhatsApp integration
    whatsapp_connected: bool = False
    connected_number: str | None = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    whatsapp_phone: str | None = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")

    # Metadata
    created_at: str | None = None
    updated_at: str | None = None
    tenant_id: str | None = None

    @validator("can_qualify")
    def validate_can_qualify(cls, v):
        """can_qualify must be True"""
        if not v:
            raise ValueError("can_qualify must be True")
        return v

    @validator("can_capture_data")
    def validate_can_capture_data(cls, v):
        """can_capture_data must be True"""
        if not v:
            raise ValueError("can_capture_data must be True")
        return v

    class Config:
        schema_extra = {
            "example": {
                "name": "Customer Support Assistant",
                "description": "AI assistant for customer support and lead qualification",
                "selected_archetype": "professional",
                "personality_instructions": "Be helpful, professional, and solution-oriented",
                "objective": "Qualify leads and provide excellent customer support",
                "can_schedule": True,
                "can_sell": False,
                "can_qualify": True,
                "can_capture_data": True,
                "product_service": "SaaS platform for business automation",
                "main_benefits": "Save time, increase efficiency, reduce costs",
                "target_audience": "Small and medium businesses",
                "formality_level": 7,
                "detail_level": 6,
                "emoji_usage": 2,
                "whatsapp_connected": False,
            }
        }


class AssistantCreateRequest(BaseModel):
    """Request to create assistant"""

    config: AssistantConfig

    class Config:
        schema_extra = {
            "example": {
                "config": {
                    "name": "Sales Assistant",
                    "description": "AI assistant for sales and lead qualification",
                    "selected_archetype": "enthusiastic",
                    "can_schedule": True,
                    "can_sell": True,
                    "can_qualify": True,
                    "can_capture_data": True,
                    "formality_level": 6,
                    "detail_level": 7,
                    "emoji_usage": 4,
                }
            }
        }


class AssistantUpdateRequest(BaseModel):
    """Request to update assistant"""

    config: AssistantConfig


class AssistantResponse(BaseModel):
    """Assistant response with metadata"""

    id: str = Field(..., description="Assistant unique identifier")
    config: AssistantConfig
    status: str = Field("active", description="Assistant status")

    class Config:
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "config": {
                    "name": "Customer Support Assistant",
                    "description": "AI assistant for customer support",
                    "selected_archetype": "professional",
                    "can_qualify": True,
                    "can_capture_data": True,
                    "formality_level": 7,
                    "detail_level": 6,
                    "emoji_usage": 2,
                },
                "status": "active",
            }
        }


class AssistantListRequest(BaseModel):
    """Request for listing assistants with pagination"""

    page: int = Field(1, ge=1, description="Page number (1-based)")
    page_size: int = Field(10, ge=1, le=100, description="Items per page (1-100)")


class AssistantListResponse(BaseModel):
    """Response for listing assistants"""

    assistants: list[AssistantResponse]
    total: int = Field(..., description="Total number of assistants")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")

    class Config:
        schema_extra = {
            "example": {
                "assistants": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "config": {
                            "name": "Support Assistant",
                            "can_qualify": True,
                            "can_capture_data": True,
                        },
                        "status": "active",
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 10,
                "total_pages": 1,
            }
        }


# Message schemas
class ConversationMessage(BaseModel):
    """Single conversation message"""

    role: str = Field(..., description="user or assistant")
    content: str
    timestamp: str | None = None


class ConversationSendRequest(BaseModel):
    """Send message to assistant"""

    assistant_id: str
    conversation_id: str | None = None
    message: str
    user_id: str | None = None


class ConversationResponse(BaseModel):
    """Response from conversation"""

    message: str
    conversation_id: str
    assistant_id: str
    metadata: dict = {}


# RAG schemas
class RAGQueryRequest(BaseModel):
    """RAG query request"""

    query: str
    assistant_id: str | None = None
    limit: int = Field(5, ge=1, le=20)


class RAGQueryResponse(BaseModel):
    """RAG query response"""

    results: list[dict]
    query: str
    total_results: int


class DocumentUploadResponse(BaseModel):
    """Response from document upload"""

    ok: bool = True
    count_indexed: int
    document_id: str
    message: str


class DocumentListResponse(BaseModel):
    """Response for document listing"""

    documents: list[dict]
    total: int
    processed: int


class RAGAnswerResult(BaseModel):
    """Single RAG answer result"""

    text: str
    source: str
    confidence: float
    document_id: str


class RAGQueryResponseV5(BaseModel):
    """Enhanced RAG query response for Prompt 5"""

    answers: list[dict]  # Use dict to allow flexible field structure
    meta: dict


# Intent and sentiment schemas
class IntentRequest(BaseModel):
    """Intent analysis request"""

    text: str
    assistant_id: str | None = None


class IntentResponse(BaseModel):
    """Intent analysis response"""

    intent: str
    confidence: float
    entities: dict = {}


class SentimentRequest(BaseModel):
    """Sentiment analysis request"""

    text: str


class SentimentResponse(BaseModel):
    """Sentiment analysis response"""

    sentiment: str  # positive, negative, neutral
    confidence: float
    score: float | None = None
