import asyncio
import uuid
from datetime import UTC, datetime

from celery import Celery
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_X, ST_Y
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.drilling import Drilling, DrillingStatus
from app.services.antipode import calculate_antipode
from app.services.spatial import (
    ensure_spatial_data,
    find_country,
    find_nearest_land,
    find_nearest_place,
    find_state,
    is_land,
)
from app.services.spatial.types import CountryInfo, PlaceInfo

settings = get_settings()
celery_app = Celery("terra_atraves", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_track_started=True, task_serializer="json", accept_content=["json"])


async def set_progress(redis: Redis, drilling_id: uuid.UUID, progress: int, stage: str) -> None:
    await redis.hset(
        f"drilling:{drilling_id}:progress",
        mapping={"progress": progress, "stage": stage},
    )
    await redis.expire(f"drilling:{drilling_id}:progress", 86400)


def point(longitude: float, latitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def store_country(drilling: Drilling, country: CountryInfo | None) -> None:
    if country is None:
        return
    drilling.destination_country_name = country.name
    drilling.destination_country_iso_a2 = country.iso_a2
    drilling.destination_country_iso_a3 = country.iso_a3


def store_nearest_place(drilling: Drilling, place_info: PlaceInfo | None) -> None:
    if place_info is None:
        return
    drilling.nearest_place = place_info.name
    drilling.nearest_place_country = place_info.country
    drilling.nearest_place_point = point(place_info.longitude, place_info.latitude)
    drilling.nearest_place_distance_m = place_info.distance_m


async def run_drilling(drilling_id: uuid.UUID) -> None:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    worker_engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(worker_engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            statement = select(
                Drilling,
                ST_Y(Drilling.origin).label("latitude"),
                ST_X(Drilling.origin).label("longitude"),
            ).where(Drilling.id == drilling_id)
            row = (await session.execute(statement)).one_or_none()
            if row is None:
                return

            drilling = row[0]
            drilling.status = DrillingStatus.PROCESSING.value
            drilling.progress = 10
            drilling.stage = "calculating_antipode"
            await session.commit()
            await set_progress(redis, drilling_id, 10, drilling.stage)

            antipode = calculate_antipode(row.latitude, row.longitude)
            drilling.antipode = point(antipode.longitude, antipode.latitude)
            drilling.progress = 30
            drilling.stage = "classifying_destination"
            await session.commit()
            await set_progress(redis, drilling_id, 30, drilling.stage)

            await ensure_spatial_data(session)
            destination_is_land = await is_land(
                session, antipode.latitude, antipode.longitude
            )
            drilling.destination_is_land = destination_is_land
            drilling.progress = 55
            drilling.stage = (
                "resolving_region" if destination_is_land else "finding_nearest_land"
            )
            await session.commit()
            await set_progress(redis, drilling_id, 55, drilling.stage)

            nearest_place = await find_nearest_place(
                session, antipode.latitude, antipode.longitude
            )
            store_nearest_place(drilling, nearest_place)

            if destination_is_land:
                country = await find_country(session, antipode.latitude, antipode.longitude)
                state = await find_state(session, antipode.latitude, antipode.longitude)
                store_country(drilling, country)
                if state is not None:
                    drilling.destination_state_name = state.name
                    drilling.destination_state_admin = state.admin
                drilling.destination_label = country.name if country else "Terra"
            else:
                nearest_land = await find_nearest_land(
                    session, antipode.latitude, antipode.longitude
                )
                drilling.destination_label = "Oceano"
                if nearest_land is not None:
                    drilling.nearest_land_point = point(
                        nearest_land.longitude, nearest_land.latitude
                    )
                    drilling.nearest_land_distance_m = nearest_land.distance_m
                    nearest_country = await find_country(
                        session, nearest_land.latitude, nearest_land.longitude
                    )
                    if nearest_country is not None:
                        drilling.nearest_land_country_name = nearest_country.name
                        drilling.nearest_land_country_iso_a2 = nearest_country.iso_a2
                        drilling.nearest_land_country_iso_a3 = nearest_country.iso_a3
                    nearest_land_place = await find_nearest_place(
                        session, nearest_land.latitude, nearest_land.longitude
                    )
                    if nearest_land_place is not None:
                        drilling.nearest_land_place = nearest_land_place.name
                        drilling.nearest_land_place_country = nearest_land_place.country
                        drilling.nearest_land_place_point = point(
                            nearest_land_place.longitude, nearest_land_place.latitude
                        )
                        drilling.nearest_land_place_distance_m = nearest_land_place.distance_m

            drilling.status = DrillingStatus.COMPLETED.value
            drilling.progress = 100
            drilling.stage = "completed"
            drilling.error = None
            drilling.completed_at = datetime.now(UTC)
            await session.commit()
            await set_progress(redis, drilling_id, 100, drilling.stage)
    except Exception as exc:
        async with session_factory() as session:
            drilling = await session.get(Drilling, drilling_id)
            if drilling is not None:
                drilling.status = DrillingStatus.FAILED.value
                drilling.stage = "failed"
                drilling.error = str(exc)[:2000]
                await session.commit()
        raise
    finally:
        await redis.aclose()
        await worker_engine.dispose()


@celery_app.task(name="app.worker.process_drilling")
def process_drilling(drilling_id: str) -> None:
    asyncio.run(run_drilling(uuid.UUID(drilling_id)))
