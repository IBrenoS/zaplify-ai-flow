import os
from dotenv import load_dotenv

load_dotenv()

class AnalyticsConfig:
    # Service Configuration
    SERVICE_NAME = "analytics-service"
    VERSION = "1.0.0"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8003))
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
    AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
    WHATSAPP_SERVICE_URL = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:8002")

    # Analytics Configuration
    CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))  # 1 hour
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", 1000))
    MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", 10))

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Metrics Configuration
    METRICS_RETENTION_DAYS = int(os.getenv("METRICS_RETENTION_DAYS", 90))
    REAL_TIME_WINDOW_MINUTES = int(os.getenv("REAL_TIME_WINDOW_MINUTES", 5))

analytics_config = AnalyticsConfig()
