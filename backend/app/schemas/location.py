from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ReverseGeocodingResponse(Coordinates):
    display_name: str
    address: dict[str, str]
    cached: bool
