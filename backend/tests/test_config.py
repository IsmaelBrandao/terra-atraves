import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.parametrize("scheme", ["postgres://", "postgresql://"])
def test_database_url_uses_asyncpg_for_railway_urls(scheme: str) -> None:
    settings = Settings(database_url=f"{scheme}user:password@host:5432/database")

    assert settings.database_url == "postgresql+asyncpg://user:password@host:5432/database"


def test_database_url_preserves_explicit_asyncpg_driver() -> None:
    url = "postgresql+asyncpg://user:password@host:5432/database"

    assert Settings(database_url=url).database_url == url


def test_database_url_rejects_an_incompatible_driver() -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL must start"):
        Settings(database_url="sqlite:///terra.db")


def test_cors_origins_accept_csv_and_normalize_trailing_slashes() -> None:
    settings = Settings(
        cors_origins="https://terra.example/, http://localhost:5173",
    )

    assert settings.cors_origins == ["https://terra.example", "http://localhost:5173"]


def test_cors_origins_reject_wildcard() -> None:
    with pytest.raises(ValidationError, match="must not contain"):
        Settings(cors_origins="*")
