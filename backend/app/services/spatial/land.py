from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SpatialDataUnavailable(RuntimeError):
    pass


async def ensure_spatial_data(session: AsyncSession) -> None:
    statement = text(
        """
        SELECT
            EXISTS (SELECT 1 FROM natural_earth_land LIMIT 1) AS has_land,
            EXISTS (SELECT 1 FROM natural_earth_countries LIMIT 1) AS has_countries,
            EXISTS (SELECT 1 FROM natural_earth_states LIMIT 1) AS has_states,
            EXISTS (SELECT 1 FROM natural_earth_populated_places LIMIT 1) AS has_places
        """
    )
    row = (await session.execute(statement)).one()
    missing = [
        name
        for name, available in (
            ("land", row.has_land),
            ("countries", row.has_countries),
            ("states", row.has_states),
            ("populated_places", row.has_places),
        )
        if not available
    ]
    if missing:
        raise SpatialDataUnavailable(
            f"Natural Earth data not imported for: {', '.join(missing)}"
        )


async def is_land(session: AsyncSession, latitude: float, longitude: float) -> bool:
    statement = text(
        """
        WITH input AS (
            SELECT ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom
        )
        SELECT EXISTS (
            SELECT 1
            FROM natural_earth_land AS land, input
            WHERE land.geom && input.geom
              AND ST_Covers(land.geom, input.geom)
        )
        """
    )
    return bool(
        (await session.execute(statement, {"latitude": latitude, "longitude": longitude}))
        .scalars()
        .one()
    )
