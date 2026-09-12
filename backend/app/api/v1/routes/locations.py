from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis

from app.api.dependencies import get_http_client, get_redis
from app.core.config import get_settings
from app.schemas.location import ReverseGeocodingResponse
from app.services.reverse_geocoding import ReverseGeocoder, ReverseGeocodingError

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/reverse", response_model=ReverseGeocodingResponse, operation_id="reverseLocation")
async def reverse_location(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> ReverseGeocodingResponse:
    try:
        payload = await ReverseGeocoder(client, redis, get_settings()).reverse(lat, lon)
    except ReverseGeocodingError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return ReverseGeocodingResponse.model_validate(payload)
