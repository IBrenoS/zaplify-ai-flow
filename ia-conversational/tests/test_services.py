import pytest
from services.intent_classifier import IntentClassifier
from services.memory_manager import ConversationMemory, ResponseTemplateManager

@pytest.mark.asyncio
async def test_intent_classifier():
    classifier = IntentClassifier()
    
    # Test greeting intent
    result = await classifier.classify_intent("olá, como vai?")
    assert result["intent"] == "greeting"
    assert result["confidence"] > 0

@pytest.mark.asyncio 
async def test_conversation_memory():
    memory = ConversationMemory()
    
    # Test storing and retrieving messages
    await memory.store_message("test_user", "test_session", {
        "role": "user",
        "content": "Hello"
    })
    
    history = await memory.get_conversation_history("test_user", "test_session")
    assert len(history) == 1
    assert history[0]["content"] == "Hello"

def test_response_template_manager():
    manager = ResponseTemplateManager()
    
    template = manager.get_template("greeting", "first_time")
    assert "Olá" in template
    
    intents = manager.get_available_intents()
    assert "greeting" in intents
    assert "pricing_inquiry" in intents
