from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/bizvalidation"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = "dummy-key"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
