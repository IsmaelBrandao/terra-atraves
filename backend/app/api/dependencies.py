import httpx
from fastapi import Request
from redis.asyncio import Redis


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


def get_redis(request: Request) -> Redis:
    return request.app.state.redis
