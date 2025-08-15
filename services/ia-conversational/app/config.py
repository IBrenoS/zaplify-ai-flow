"""
Configuration management for IA Conversational Service
"""

import os


class Config:
    """Centralized configuration management"""

    # Feature flags
    ENABLE_TRANSFORMERS: bool = (
        os.getenv("ENABLE_TRANSFORMERS", "false").lower() == "true"
    )
    ENABLE_KAFKA: bool = os.getenv("ENABLE_KAFKA", "false").lower() == "true"
    ENABLE_MODERATION: bool = os.getenv("ENABLE_MODERATION", "false").lower() == "true"
    ENABLE_PII_MASKING: bool = os.getenv("ENABLE_PII_MASKING", "true").lower() == "true"
    ENABLE_AUDIT_LOGGING: bool = (
        os.getenv("ENABLE_AUDIT_LOGGING", "true").lower() == "true"
    )

    # Kafka/Redpanda Configuration
    KAFKA_BROKER: str = os.getenv("KAFKA_BROKER", "redpanda:9092")
    KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "ia-conversational")
    KAFKA_MESSAGE_RECEIVED_TOPIC: str = os.getenv(
        "KAFKA_MESSAGE_RECEIVED_TOPIC", "conversation.message_received"
    )
    KAFKA_MESSAGE_GENERATED_TOPIC: str = os.getenv(
        "KAFKA_MESSAGE_GENERATED_TOPIC", "conversation.message_generated"
    )

    # NLP Models
    INTENT_MODEL_NAME: str = os.getenv(
        "INTENT_MODEL_NAME", "MoritzLaurer/deberta-v3-base-zeroshot-v1"
    )

    SENTIMENT_MODEL_NAME: str = os.getenv(
        "SENTIMENT_MODEL_NAME", "cardiffnlp/twitter-roberta-base-sentiment-latest"
    )

    # Model loading configuration
    MODEL_CACHE_SIZE: int = int(os.getenv("MODEL_CACHE_SIZE", "2"))
    MODEL_TIMEOUT_SECONDS: int = int(os.getenv("MODEL_TIMEOUT_SECONDS", "30"))

    # Default intent labels for zero-shot classification
    DEFAULT_INTENT_LABELS: list[str] = [
        "purchase",
        "support",
        "scheduling",
        "complaint",
        "question",
        "greeting",
        "goodbye",
        "other",
    ]

    # Confidence thresholds
    MIN_INTENT_CONFIDENCE: float = float(os.getenv("MIN_INTENT_CONFIDENCE", "0.3"))
    MIN_SENTIMENT_CONFIDENCE: float = float(
        os.getenv("MIN_SENTIMENT_CONFIDENCE", "0.5")
    )


# Global config instance
config = Config()
