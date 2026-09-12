import asyncio
import json
from typing import Any

import httpx
from redis.asyncio import Redis

from app.core.config import Settings


class ReverseGeocodingError(RuntimeError):
    pass


class NominatimRateLimiter:
    def __init__(self, redis: Redis, key: str = "nominatim:rate-limit") -> None:
        self.redis = redis
        self.key = key

    async def acquire(self) -> None:
        while not await self.redis.set(self.key, "1", ex=1, nx=True):  # noqa: ASYNC110
            await asyncio.sleep(0.1)


class ReverseGeocoder:
    def __init__(self, client: httpx.AsyncClient, redis: Redis, settings: Settings) -> None:
        self.client = client
        self.redis = redis
        self.settings = settings
        self.rate_limiter = NominatimRateLimiter(redis)

    @staticmethod
    def cache_key(latitude: float, longitude: float) -> str:
        return f"reverse:{latitude:.5f}:{longitude:.5f}"

    async def reverse(self, latitude: float, longitude: float) -> dict[str, Any]:
        key = self.cache_key(latitude, longitude)
        cached = await self.redis.get(key)
        if cached:
            try:
                cached_payload = json.loads(cached)
            except json.JSONDecodeError:
                await self.redis.delete(key)
            else:
                if isinstance(cached_payload, dict):
                    return {
                        "latitude": latitude,
                        "longitude": longitude,
                        "display_name": cached_payload.get(
                            "display_name", "Local não identificado"
                        ),
                        "address": cached_payload.get("address", {}),
                        "cached": True,
                    }

        await self.rate_limiter.acquire()
        try:
            response = await self.client.get(
                f"{self.settings.nominatim_base_url.rstrip('/')}/reverse",
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "format": "jsonv2",
                    "addressdetails": 1,
                },
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("unexpected reverse geocoding payload")
        except (httpx.HTTPError, ValueError) as exc:
            raise ReverseGeocodingError("reverse geocoding provider unavailable") from exc

        cached_payload = {
            "display_name": data.get("display_name", "Local não identificado"),
            "address": {str(k): str(v) for k, v in data.get("address", {}).items()},
        }
        await self.redis.set(
            key,
            json.dumps(cached_payload),
            ex=self.settings.reverse_geocoding_cache_ttl_seconds,
        )
        return {
            "latitude": latitude,
            "longitude": longitude,
            **cached_payload,
            "cached": False,
        }
