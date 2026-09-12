import os
import uuid

import pytest
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.drilling import Drilling, DrillingStatus
from app.services.antipode import calculate_antipode
from app.services.spatial import (
    find_country,
    find_nearest_land,
    find_nearest_place,
    find_state,
    is_land,
)
from app.worker import run_drilling

pytestmark = [
    pytest.mark.spatial,
    pytest.mark.skipif(
        os.getenv("RUN_SPATIAL_INTEGRATION") != "1",
        reason="set RUN_SPATIAL_INTEGRATION=1 with imported Natural Earth data",
    ),
]

FORTALEZA = (-3.7319, -38.5267)


@pytest.fixture
async def session() -> AsyncSession:
    engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as database_session:
        yield database_session
    await engine.dispose()


@pytest.mark.asyncio
async def test_clearly_land_and_ocean_points(session: AsyncSession) -> None:
    assert await is_land(session, *FORTALEZA) is True
    assert await is_land(session, 0, -140) is False


@pytest.mark.asyncio
async def test_point_near_fortaleza_coast(session: AsyncSession) -> None:
    latitude, longitude = -3.72, -38.40
    assert await is_land(session, latitude, longitude) is False
    nearest = await find_nearest_land(session, latitude, longitude)
    assert nearest is not None
    assert 0 < nearest.distance_m < 25_000


@pytest.mark.asyncio
async def test_fortaleza_country_state_and_nearest_place(session: AsyncSession) -> None:
    country = await find_country(session, *FORTALEZA)
    state = await find_state(session, *FORTALEZA)
    place = await find_nearest_place(session, *FORTALEZA)

    assert country is not None
    assert country.name == "Brasil"
    assert country.iso_a2 == "BR"
    assert country.iso_a3 == "BRA"
    assert state is not None
    assert state.name == "Ceará"
    assert place is not None
    assert place.name == "Fortaleza"
    assert place.distance_m < 10_000


@pytest.mark.asyncio
async def test_missing_state_is_not_an_error(session: AsyncSession) -> None:
    country = await find_country(session, 15.7955793, -79.9879384)
    state = await find_state(session, 15.7955793, -79.9879384)
    assert country is not None
    assert country.name == "Ilha Baixo Novo"
    assert state is None


@pytest.mark.asyncio
async def test_fortaleza_antipode_and_geodesic_nearest_land(session: AsyncSession) -> None:
    antipode = calculate_antipode(*FORTALEZA)
    assert antipode.latitude == pytest.approx(3.7319)
    assert antipode.longitude == pytest.approx(141.4733)
    assert await is_land(session, antipode.latitude, antipode.longitude) is False

    nearest = await find_nearest_land(session, antipode.latitude, antipode.longitude)
    assert nearest is not None
    assert nearest.distance_m == pytest.approx(479_706.245, rel=1e-5)
    assert nearest.latitude == pytest.approx(7.3678246, rel=1e-5)
    assert nearest.longitude == pytest.approx(143.8349716, rel=1e-5)


@pytest.mark.asyncio
async def test_complete_drilling_job(session: AsyncSession) -> None:
    drilling_id = uuid.uuid4()
    session.add(
        Drilling(
            id=drilling_id,
            origin=WKTElement("POINT(-38.5267 -3.7319)", srid=4326),
            status=DrillingStatus.QUEUED.value,
            progress=0,
            stage="queued",
            origin_label="Fortaleza, Ceará, Brasil",
        )
    )
    await session.commit()

    try:
        await run_drilling(drilling_id)
        session.expire_all()
        result = await session.execute(select(Drilling).where(Drilling.id == drilling_id))
        drilling = result.scalar_one()
        assert drilling.status == DrillingStatus.COMPLETED.value
        assert drilling.progress == 100
        assert drilling.stage == "completed"
        assert drilling.destination_is_land is False
        assert drilling.nearest_land_distance_m == pytest.approx(479_706.245, rel=1e-5)
        assert drilling.nearest_place == "Jayapura"
    finally:
        await session.execute(delete(Drilling).where(Drilling.id == drilling_id))
        await session.commit()
