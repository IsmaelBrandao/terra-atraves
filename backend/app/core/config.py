from functools import lru_cache
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def normalize_database_url(value: str) -> str:
    """Return a PostgreSQL URL that is explicit about the asyncpg driver."""
    normalized = value.strip()
    for prefix in ("postgres://", "postgresql://"):
        if normalized.startswith(prefix):
            return f"postgresql+asyncpg://{normalized.removeprefix(prefix)}"
    if normalized.startswith("postgresql+asyncpg://"):
        return normalized
    raise ValueError(
        "DATABASE_URL must start with postgres://, postgresql://, "
        "or postgresql+asyncpg://"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Terra Através API"
    database_url: str = "postgresql+asyncpg://terra:terra_dev@localhost:5432/terra_atraves"
    redis_url: str = "redis://localhost:6379/0"
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    nominatim_user_agent: str = "TerraAtraves/0.1 (academic project)"
    nominatim_timeout_seconds: float = 10
    reverse_geocoding_cache_ttl_seconds: int = 604800
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("database_url", mode="before")
    @classmethod
    def use_asyncpg_driver(cls, value: object) -> object:
        if not isinstance(value, str):
            raise ValueError("DATABASE_URL must be a PostgreSQL URL")
        return normalize_database_url(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("CORS_ORIGINS must contain at least one origin")

        origins: list[str] = []
        for raw_origin in value:
            origin = raw_origin.strip().rstrip("/")
            parsed = urlsplit(origin)
            if origin == "*":
                raise ValueError("CORS_ORIGINS must not contain '*'")
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"invalid CORS origin: {raw_origin}")
            if origin not in origins:
                origins.append(origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
