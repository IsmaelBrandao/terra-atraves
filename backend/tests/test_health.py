import pytest

from app.api.v1.routes.health import health


@pytest.mark.asyncio
async def test_health() -> None:
    assert await health() == {"status": "ok"}
