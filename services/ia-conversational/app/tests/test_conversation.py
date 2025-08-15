"""
Test conversation endpoints for Prompt 4 implementation
Tests: fallback responses, personality integration, correlation tracking
"""

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.assistant import AssistantConfig, AssistantCreateRequest

client = TestClient(app)


@pytest.fixture
def test_assistant():
    """Create test assistant for conversation tests"""
    config = AssistantConfig(
        name="Test Conversation Assistant",
        description="Assistant for testing conversation flow",
        selected_archetype="friendly",
        personality_instructions="Be helpful and conversational",
        objective="Test conversations and provide helpful responses",
        can_schedule=True,
        can_sell=False,
        can_qualify=True,
        can_capture_data=True,
        product_service="Test product for conversations",
        main_benefits="Easy testing and validation",
        formality_level=5,
        detail_level=6,
        emoji_usage=3,
    )

    request_data = AssistantCreateRequest(config=config)

    response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "test-conversation"},
    )

    assert response.status_code == 201
    return response.json()


def test_conversation_without_openai_fallback(test_assistant):
    """Test conversation works correctly (with or without OpenAI API key)"""
    assistant_id = test_assistant["id"]

    conversation_data = {
        "assistantId": assistant_id,
        "message": "Hello, how can you help me?",
    }

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={
            "x-tenant-id": "test-conversation",
            "x-correlation-id": "test-conv-001",
        },
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "reply" in data
    assert "meta" in data

    # Verify reply is not empty
    assert len(data["reply"]) > 0

    # Check if using fallback or real LLM
    meta = data["meta"]
    if not meta["llm_available"]:
        # No OpenAI API key - should use fallback
        assert "(stub) Resposta para:" in data["reply"]
        assert "Hello, how can you help me?" in data["reply"]
        assert meta["response_type"] == "fallback"
    else:
        # OpenAI API key available - should get real LLM response
        assert len(data["reply"]) > 10  # Real responses should be longer
        assert meta["response_type"] == "llm"

    # Verify metadata
    assert meta["assistant_id"] == assistant_id
    assert meta["tenant_id"] == "test-conversation"
    assert meta["correlation_id"] == "test-conv-001"


def test_conversation_fallback_forced(test_assistant):
    """Test conversation fallback when LLM service is not available"""
    assistant_id = test_assistant["id"]

    conversation_data = {
        "assistantId": assistant_id,
        "message": "Test fallback message",
    }

    # Mock the LLM service to force fallback
    with patch("app.services.llm_service.llm_service.is_available", return_value=False):
        response = client.post(
            "/conversation/",
            json=conversation_data,
            headers={"x-tenant-id": "test-conversation"},
        )

    assert response.status_code == 200
    data = response.json()

    # Should use fallback response
    assert "(stub) Resposta para:" in data["reply"]
    assert "Test fallback message" in data["reply"]
    assert not data["meta"]["llm_available"]
    assert data["meta"]["response_type"] == "fallback"


def test_conversation_respects_correlation():
    """Test that conversation includes correlation tracking"""
    # Create assistant first
    config = AssistantConfig(
        name="Correlation Test Assistant", selected_archetype="professional"
    )

    request_data = AssistantCreateRequest(config=config)

    assistant_response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "test-correlation-conv"},
    )

    assert assistant_response.status_code == 201
    assistant_id = assistant_response.json()["id"]

    # Test conversation with correlation
    conversation_data = {
        "assistantId": assistant_id,
        "message": "Test correlation tracking",
    }

    correlation_id = str(uuid.uuid4())

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={
            "x-tenant-id": "test-correlation-conv",
            "x-correlation-id": correlation_id,
        },
    )

    assert response.status_code == 200
    data = response.json()

    # Verify correlation is preserved
    assert data["meta"]["correlation_id"] == correlation_id
    assert data["meta"]["tenant_id"] == "test-correlation-conv"


def test_conversation_assistant_not_found():
    """Test conversation with non-existent assistant"""
    conversation_data = {"assistantId": "non-existent-id", "message": "Hello"}

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={"x-tenant-id": "test-conversation"},
    )

    assert response.status_code == 404
    assert "Assistant not found" in response.json()["detail"]


def test_conversation_tenant_isolation():
    """Test that conversation respects tenant isolation"""
    # Create assistant in tenant A
    config = AssistantConfig(name="Tenant A Assistant", selected_archetype="friendly")

    request_data = AssistantCreateRequest(config=config)

    response_a = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "tenant-a"},
    )

    assert response_a.status_code == 201
    assistant_id = response_a.json()["id"]

    # Try to access from tenant B
    conversation_data = {"assistantId": assistant_id, "message": "Hello from tenant B"}

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={"x-tenant-id": "tenant-b"},  # Different tenant
    )

    assert response.status_code == 404
    assert "Assistant not found" in response.json()["detail"]


def test_conversation_personality_integration(test_assistant):
    """Test that conversation processes messages correctly"""
    assistant_id = test_assistant["id"]

    conversation_data = {
        "assistantId": assistant_id,
        "message": "What is your personality?",
    }

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={"x-tenant-id": "test-conversation"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify reply is generated and not empty
    assert len(data["reply"]) > 0
    assert data["meta"]["assistant_id"] == assistant_id

    # Should get some kind of response about the assistant
    reply_lower = data["reply"].lower()
    assert any(
        word in reply_lower for word in ["assistant", "help", "personality", "friendly"]
    )


def test_conversation_empty_message(test_assistant):
    """Test conversation with empty message"""
    assistant_id = test_assistant["id"]

    conversation_data = {"assistantId": assistant_id, "message": ""}

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={"x-tenant-id": "test-conversation"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should still get some response
    assert len(data["reply"]) > 0


def test_conversation_long_message(test_assistant):
    """Test conversation with long message"""
    assistant_id = test_assistant["id"]

    long_message = "This is a very long message. " * 50  # ~1000+ characters

    conversation_data = {"assistantId": assistant_id, "message": long_message}

    response = client.post(
        "/conversation/",
        json=conversation_data,
        headers={"x-tenant-id": "test-conversation"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should handle long messages properly
    assert len(data["reply"]) > 0


def test_intent_classify_stub():
    """Test intent classification stub endpoint"""
    intent_data = {"text": "I want to buy something"}

    response = client.post(
        "/intent/classify",
        json=intent_data,
        headers={"x-tenant-id": "test-intent", "x-correlation-id": "intent-001"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify stub response as per Prompt 4 requirements
    assert data["intent"] == "generic"
    assert data["confidence"] == 0.6
    assert "entities" in data
    assert isinstance(data["entities"], dict)


def test_intent_classify_different_texts():
    """Test intent classification with different input texts"""
    test_texts = [
        "Hello there!",
        "I need help with my order",
        "Can you schedule a meeting?",
        "What are your prices?",
        "",
    ]

    for text in test_texts:
        intent_data = {"text": text}

        response = client.post(
            "/intent/classify", json=intent_data, headers={"x-tenant-id": "test-intent"}
        )

        assert response.status_code == 200
        data = response.json()

        # Should always return same stub response
        assert data["intent"] == "generic"
        assert data["confidence"] == 0.6


def test_sentiment_analyze_positive():
    """Test sentiment analysis with positive text"""
    sentiment_data = {
        "text": "This is amazing! I love it, it's fantastic and wonderful!"
    }

    response = client.post(
        "/sentiment/analyze",
        json=sentiment_data,
        headers={"x-tenant-id": "test-sentiment", "x-correlation-id": "sentiment-001"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should detect positive sentiment
    assert data["sentiment"] == "positive"
    assert data["confidence"] > 0.5
    assert data["score"] > 0


def test_sentiment_analyze_negative():
    """Test sentiment analysis with negative text"""
    sentiment_data = {"text": "This is terrible! I hate it, it's awful and horrible!"}

    response = client.post(
        "/sentiment/analyze",
        json=sentiment_data,
        headers={"x-tenant-id": "test-sentiment"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should detect negative sentiment
    assert data["sentiment"] == "negative"
    assert data["confidence"] > 0.5
    assert data["score"] < 0


def test_sentiment_analyze_neutral():
    """Test sentiment analysis with neutral text"""
    sentiment_data = {"text": "The weather is cloudy today. I went to the store."}

    response = client.post(
        "/sentiment/analyze",
        json=sentiment_data,
        headers={"x-tenant-id": "test-sentiment"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should detect neutral sentiment
    assert data["sentiment"] == "neutral"
    assert data["confidence"] >= 0.5
    assert data["score"] == 0.0


def test_sentiment_analyze_mixed():
    """Test sentiment analysis with mixed positive/negative text"""
    sentiment_data = {
        "text": "I love the design but hate the price. It's good but expensive."
    }

    response = client.post(
        "/sentiment/analyze",
        json=sentiment_data,
        headers={"x-tenant-id": "test-sentiment"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should have some sentiment analysis result
    assert data["sentiment"] in ["positive", "negative", "neutral"]
    assert isinstance(data["confidence"], float)
    assert isinstance(data["score"], float)
    assert -1 <= data["score"] <= 1


def test_sentiment_analyze_portuguese():
    """Test sentiment analysis with Portuguese text"""
    sentiment_data = {"text": "Adorei o produto! É excelente e perfeito!"}

    response = client.post(
        "/sentiment/analyze",
        json=sentiment_data,
        headers={"x-tenant-id": "test-sentiment"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should detect positive sentiment in Portuguese
    assert data["sentiment"] == "positive"
    assert data["confidence"] > 0.5
    assert data["score"] > 0
