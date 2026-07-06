import os
import logging
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PROJECT_NAME: str = "VibeNest API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-key-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str | None = None
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DEBUG: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @model_validator(mode="after")
    def validate_database_url(self) -> 'Settings':
        env = os.getenv("ENV")
        if not self.DATABASE_URL:
            if env == "production":
                raise RuntimeError(
                    "DATABASE_URL environment variable is required in production. "
                    "Set ENV=production only when DATABASE_URL is configured."
                )
            self.DATABASE_URL = "sqlite:///instance/chat.db"

        if self.DATABASE_URL.startswith("sqlite:///"):
            db_path = self.DATABASE_URL[10:]
            if db_path and db_path != ":memory:":
                db_dir = os.path.dirname(db_path)
                if db_dir and not os.path.exists(db_dir):
                    os.makedirs(db_dir, exist_ok=True)
        return self

settings = Settings()

if settings.SECRET_KEY == "dev-secret-key-change-me-in-production":
    logger.warning(
        "WARNING: Using default SECRET_KEY. "
        "Set a real SECRET_KEY in production."
    )
