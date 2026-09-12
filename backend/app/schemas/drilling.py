import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.location import Coordinates


class DrillingCreate(Coordinates):
    origin_label: str | None = Field(default=None, max_length=500)


class DrillingAccepted(BaseModel):
    id: uuid.UUID
    status: str
    status_url: str


class DrillingResponse(BaseModel):
    id: uuid.UUID
    status: str
    progress: int
    stage: str
    origin: Coordinates
    antipode: Coordinates | None
    origin_label: str | None
    destination_label: str | None
    destination_is_land: bool | None
    nearest_place: str | None
    nearest_place_distance_m: float | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None
