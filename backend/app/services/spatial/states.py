from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spatial.types import StateInfo


async def find_state(
    session: AsyncSession, latitude: float, longitude: float
) -> StateInfo | None:
    statement = text(
        """
        WITH input AS (
            SELECT ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom
        )
        SELECT state.name, state.admin, state.admin_iso_a3, state.iso_3166_2
        FROM natural_earth_states AS state, input
        WHERE state.name IS NOT NULL
          AND state.geom && input.geom
          AND ST_Covers(state.geom, input.geom)
        ORDER BY ST_Area(state.geom)
        LIMIT 1
        """
    )
    row = (
        await session.execute(statement, {"latitude": latitude, "longitude": longitude})
    ).mappings().one_or_none()
    return None if row is None else StateInfo(**row)
