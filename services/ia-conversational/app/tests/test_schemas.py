"""
Test schemas and validation
"""

import pytest
from pydantic import ValidationError

from app.schemas.assistant import (
    AssistantConfig,
    ConversationSendRequest,
    PersonalityArchetype,
    QuickResponse,
)


def test_assistant_config_minimal():
    """Test minimal assistant config"""
    config = AssistantConfig(name="Test Assistant")

    assert config.name == "Test Assistant"
    assert config.can_qualify is True  # Default value
    assert config.can_capture_data is True  # Default value
    assert config.formality_level == 5  # Default value


def test_assistant_config_full():
    """Test full assistant config"""
    config = AssistantConfig(
        name="Full Assistant",
        description="A comprehensive assistant",
        selected_archetype=PersonalityArchetype.PROFESSIONAL,
        personality_instructions="Be professional and direct",
        objective="Help with customer support",
        can_schedule=True,
        can_sell=True,
        product_service="Software solutions",
        main_benefits="Increased productivity",
        target_audience="Small businesses",
        formality_level=8,
        detail_level=7,
        emoji_usage=2,
        whatsapp_connected=True,
        connected_number="+5511999999999",
    )

    assert config.name == "Full Assistant"
    assert config.selected_archetype == PersonalityArchetype.PROFESSIONAL
    assert config.formality_level == 8
    assert config.whatsapp_connected is True


def test_assistant_config_validation():
    """Test assistant config validation"""

    # Test invalid formality level
    with pytest.raises(ValidationError):
        AssistantConfig(name="Test", formality_level=11)  # Should be 1-10


def test_quick_response():
    """Test quick response model"""
    qr = QuickResponse(trigger="pricing", response="Our pricing starts at $99/month")

    assert qr.trigger == "pricing"
    assert qr.response == "Our pricing starts at $99/month"


def test_conversation_send_request():
    """Test conversation send request"""
    request = ConversationSendRequest(
        assistant_id="123", message="Hello", conversation_id="conv-456"
    )

    assert request.assistant_id == "123"
    assert request.message == "Hello"
    assert request.conversation_id == "conv-456"
