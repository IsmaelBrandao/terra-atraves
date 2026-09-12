import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import Settings
from app.services.reverse_geocoding import (
    NominatimRateLimiter,
    ReverseGeocoder,
    ReverseGeocodingError,
)


def test_cache_key_normalizes_coordinates() -> None:
    assert ReverseGeocoder.cache_key(-3.731901, -38.526699) == "reverse:-3.73190:-38.52670"


@pytest.mark.asyncio
async def test_rate_limiter_uses_one_second_global_redis_key() -> None:
    redis = AsyncMock()
    redis.set.return_value = True

    await NominatimRateLimiter(redis).acquire()

    redis.set.assert_awaited_once_with("nominatim:rate-limit", "1", ex=1, nx=True)


@pytest.mark.asyncio
async def test_cached_result_uses_current_requested_coordinates() -> None:
    redis = AsyncMock()
    redis.get.return_value = json.dumps(
        {
            "latitude": -3.731901,
            "longitude": -38.526699,
            "display_name": "Fortaleza",
            "address": {"city": "Fortaleza"},
            "cached": False,
        }
    )
    geocoder = ReverseGeocoder(AsyncMock(), redis, Settings())

    result = await geocoder.reverse(-3.731904, -38.526696)

    assert result["latitude"] == -3.731904
    assert result["longitude"] == -38.526696
    assert result["cached"] is True


@pytest.mark.asyncio
async def test_invalid_provider_json_becomes_controlled_error() -> None:
    redis = AsyncMock()
    redis.get.return_value = None
    redis.set.return_value = True
    response = AsyncMock(spec=httpx.Response)
    response.raise_for_status.return_value = None
    response.json.side_effect = ValueError("invalid json")
    client = AsyncMock(spec=httpx.AsyncClient)
    client.get.return_value = response
    geocoder = ReverseGeocoder(client, redis, Settings())
    geocoder.rate_limiter.acquire = AsyncMock()

    with pytest.raises(ReverseGeocodingError):
        await geocoder.reverse(-3.7319, -38.5267)
