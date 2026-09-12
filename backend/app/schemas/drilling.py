import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.location import Coordinates


class DrillingCreate(Coordinates):
    origin_label: str | None = Field(default=None, max_length=500)


class DrillingAccepted(BaseModel):
    id: uuid.UUID
    status: str
    status_url: str


class CountryResult(BaseModel):
    name: str
    iso_a2: str | None
    iso_a3: str | None


class StateResult(BaseModel):
    name: str
    admin: str | None


class PlaceResult(BaseModel):
    name: str
    country: str | None
    coordinates: Coordinates
    distance_km: float = Field(ge=0)


class NearestLandResult(BaseModel):
    coordinates: Coordinates
    distance_km: float = Field(ge=0)
    country: CountryResult | None
    nearest_place: PlaceResult | None


class DestinationResult(BaseModel):
    type: Literal["land", "ocean"]
    country: CountryResult | None
    state: StateResult | None
    nearest_place: PlaceResult | None
    nearest_land: NearestLandResult | None


class DrillingResponse(BaseModel):
    id: uuid.UUID
    status: str
    progress: int
    stage: str
    origin: Coordinates
    antipode: Coordinates | None
    destination: DestinationResult | None
    origin_label: str | None
    destination_label: str | None
    destination_is_land: bool | None
    nearest_place: str | None
    nearest_place_distance_m: float | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None
