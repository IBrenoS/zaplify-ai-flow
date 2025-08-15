"""
Demo script to test the enhanced Intent and Sentiment analysis with HuggingFace Transformers
This script demonstrates both transformers-enabled and fallback modes
"""

import asyncio
import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.config import config
from app.services.nlp_service import nlp_service


async def test_intent_classification():
    """Test intent classification with various examples"""
    print("🎯 Testing Intent Classification")
    print("=" * 50)

    test_cases = [
        "I want to buy this product",
        "I need help with my account",
        "Can I schedule an appointment?",
        "This service is terrible",
        "What time do you open?",
        "Hello there!",
        "Goodbye for now",
        "Quero comprar este produto",
        "Preciso de ajuda",
        "Random text here",
    ]

    for text in test_cases:
        intent, confidence, metadata = await nlp_service.classify_intent(
            text=text, correlation_id="demo-test", tenant_id="demo"
        )

        print(f"Text: '{text}'")
        print(f"  → Intent: {intent} (confidence: {confidence:.2f})")
        print(f"  → Method: {metadata.get('method', 'unknown')}")
        print()


async def test_sentiment_analysis():
    """Test sentiment analysis with various examples"""
    print("😊 Testing Sentiment Analysis")
    print("=" * 50)

    test_cases = [
        "This is amazing and wonderful!",
        "I love this product so much",
        "This is terrible and awful",
        "I hate this service",
        "Just some normal text here",
        "Maybe it's okay",
        "Este produto é excelente!",
        "Muito ruim e péssimo",
        "Texto neutro aqui",
    ]

    for text in test_cases:
        sentiment, confidence, score, metadata = await nlp_service.analyze_sentiment(
            text=text, correlation_id="demo-test", tenant_id="demo"
        )

        print(f"Text: '{text}'")
        print(
            f"  → Sentiment: {sentiment} (confidence: {confidence:.2f}, score: {score:.2f})"
        )
        print(f"  → Method: {metadata.get('method', 'unknown')}")
        print()


async def test_service_status():
    """Test service status and configuration"""
    print("⚙️  Service Status")
    print("=" * 50)

    status = nlp_service.get_status()

    print(f"Transformers Enabled: {status['transformers_enabled']}")
    print(f"Models Available: {status['models_available']}")
    print(f"Intent Model: {status['intent_model']}")
    print(f"Sentiment Model: {status['sentiment_model']}")
    print(f"Models Loaded: {status['models_loaded']}")
    print()

    # Test with different configurations
    print("Configuration Details:")
    print(f"  → ENABLE_TRANSFORMERS: {config.ENABLE_TRANSFORMERS}")
    print(f"  → INTENT_MODEL_NAME: {config.INTENT_MODEL_NAME}")
    print(f"  → SENTIMENT_MODEL_NAME: {config.SENTIMENT_MODEL_NAME}")
    print(f"  → MODEL_TIMEOUT_SECONDS: {config.MODEL_TIMEOUT_SECONDS}")
    print(f"  → MIN_INTENT_CONFIDENCE: {config.MIN_INTENT_CONFIDENCE}")
    print(f"  → MIN_SENTIMENT_CONFIDENCE: {config.MIN_SENTIMENT_CONFIDENCE}")
    print()


async def main():
    """Main demo function"""
    print("🚀 NLP Service Demo - Prompt 7 Implementation")
    print("=" * 60)
    print("Testing Intent Classification and Sentiment Analysis")
    print("with HuggingFace Transformers and graceful fallbacks")
    print("=" * 60)
    print()

    await test_service_status()
    await test_intent_classification()
    await test_sentiment_analysis()

    print("✅ Demo completed successfully!")
    print()
    print("💡 Key Features Demonstrated:")
    print("   • Real intent classification with zero-shot learning")
    print("   • Robust sentiment analysis with score normalization")
    print("   • Graceful fallback to keyword-based analysis")
    print("   • Multilingual support (Portuguese + English)")
    print("   • Feature flags for easy enable/disable")
    print("   • Comprehensive logging and monitoring")


if __name__ == "__main__":
    asyncio.run(main())
