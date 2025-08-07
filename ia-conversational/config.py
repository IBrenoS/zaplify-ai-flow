import os
from dotenv import load_dotenv

load_dotenv()

class ConversationalConfig:
    # Service Configuration
    SERVICE_NAME = "ia-conversational"
    VERSION = "1.0.0"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8005))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

    # Database Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

    # API Configuration
    API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8000")
    WHATSAPP_SERVICE_URL = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:8002")
    ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://localhost:8003")
    FUNNEL_ENGINE_URL = os.getenv("FUNNEL_ENGINE_URL", "http://localhost:8004")

    # AI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    DEFAULT_AI_PROVIDER = os.getenv("DEFAULT_AI_PROVIDER", "openai")  # openai, anthropic

    # Model Configuration
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229")
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2000))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))

    # RAG Configuration
    EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "text-embedding-3-small")
    VECTOR_DB_URL = os.getenv("VECTOR_DB_URL", "http://localhost:6333")
    COLLECTION_NAME = os.getenv("COLLECTION_NAME", "zaplify_knowledge")
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", 5))
    RAG_THRESHOLD = float(os.getenv("RAG_THRESHOLD", 0.7))

    # Intent Classification
    INTENT_CONFIDENCE_THRESHOLD = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", 0.8))
    MAX_INTENT_HISTORY = int(os.getenv("MAX_INTENT_HISTORY", 10))

    # Sentiment Analysis
    SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest")
    SENTIMENT_THRESHOLD = float(os.getenv("SENTIMENT_THRESHOLD", 0.6))

    # Conversation Configuration
    MAX_CONVERSATION_HISTORY = int(os.getenv("MAX_CONVERSATION_HISTORY", 20))
    CONVERSATION_TIMEOUT = int(os.getenv("CONVERSATION_TIMEOUT", 1800))  # 30 minutes

    # Cache Configuration
    CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))  # 1 hour
    RESPONSE_CACHE_TTL = int(os.getenv("RESPONSE_CACHE_TTL", 300))  # 5 minutes

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 60))
    RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", 1000))

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Processing Configuration
    ASYNC_PROCESSING = os.getenv("ASYNC_PROCESSING", "true").lower() == "true"
    MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", 10))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 30))

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = os.getenv("LOG_FORMAT", "json")

conversational_config = ConversationalConfig()
