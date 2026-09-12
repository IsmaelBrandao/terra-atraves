from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spatial.types import PlaceInfo


async def find_nearest_place(
    session: AsyncSession, latitude: float, longitude: float
) -> PlaceInfo | None:
    statement = text(
        """
        WITH input AS (
            SELECT
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography AS geog
        )
        SELECT
            place.name,
            place.country,
            place.admin1,
            ST_Y(place.geom) AS latitude,
            ST_X(place.geom) AS longitude,
            ST_Distance(place.geom::geography, input.geog) AS distance_m
        FROM natural_earth_populated_places AS place, input
        ORDER BY place.geom::geography <-> input.geog
        LIMIT 1
        """
    )
    row = (
        await session.execute(statement, {"latitude": latitude, "longitude": longitude})
    ).mappings().one_or_none()
    return None if row is None else PlaceInfo(**row)
