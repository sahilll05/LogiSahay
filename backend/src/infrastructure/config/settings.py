from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # WhatsApp Cloud API (Meta)
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "LOGISAHAY_VERIFY_2026"
    WHATSAPP_BUSINESS_ID: str = ""

    # Courier APIs (optional, not required for deterministic engine)
    SHIPROCKET_EMAIL: str = ""
    SHIPROCKET_PASSWORD: str = ""
    DELHIVERY_API_KEY: str = ""
    DELHIVERY_PARTNER_CODE: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
