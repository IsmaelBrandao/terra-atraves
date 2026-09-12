from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spatial.types import CountryInfo


async def find_country(
    session: AsyncSession, latitude: float, longitude: float
) -> CountryInfo | None:
    statement = text(
        """
        WITH input AS (
            SELECT ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom
        )
        SELECT country.name, country.iso_a2, country.iso_a3
        FROM natural_earth_countries AS country, input
        WHERE country.geom && input.geom
          AND ST_Covers(country.geom, input.geom)
        ORDER BY ST_Area(country.geom)
        LIMIT 1
        """
    )
    row = (
        await session.execute(statement, {"latitude": latitude, "longitude": longitude})
    ).mappings().one_or_none()
    return None if row is None else CountryInfo(**row)
