from fastapi import APIRouter

from app.api.v1.routes import drillings, health, locations

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(locations.router)
api_router.include_router(drillings.router)
