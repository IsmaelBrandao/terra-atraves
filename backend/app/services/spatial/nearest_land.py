from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spatial.types import NearestLandInfo


async def find_nearest_land(
    session: AsyncSession, latitude: float, longitude: float
) -> NearestLandInfo | None:
    statement = text(
        """
        WITH candidate AS (
            SELECT land.geom
            FROM natural_earth_land AS land
            ORDER BY land.geom::geography <->
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
            LIMIT 1
        ),
        result AS (
            SELECT
                ST_ClosestPoint(
                    candidate.geom::geography,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
                ) AS geog
            FROM candidate
        )
        SELECT
            ST_Y(result.geog::geometry) AS latitude,
            ST_X(result.geog::geometry) AS longitude,
            ST_Distance(
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                result.geog
            ) AS distance_m
        FROM result
        """
    )
    row = (
        await session.execute(statement, {"latitude": latitude, "longitude": longitude})
    ).mappings().one_or_none()
    return None if row is None else NearestLandInfo(**row)
