from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # OpenAI
    OPENAI_API_KEY: str

    # WhatsApp Business API
    WHATSAPP_API_TOKEN: str
    WHATSAPP_VERIFY_TOKEN: str

    class Config:
        env_file = ".env"


settings = Settings()
