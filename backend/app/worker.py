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

settings = get_settings()
celery_app = Celery("terra_atraves", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_track_started=True, task_serializer="json", accept_content=["json"])


async def set_progress(redis: Redis, drilling_id: uuid.UUID, progress: int, stage: str) -> None:
    await redis.hset(
        f"drilling:{drilling_id}:progress",
        mapping={"progress": progress, "stage": stage},
    )
    await redis.expire(f"drilling:{drilling_id}:progress", 86400)


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
            drilling.progress = 20
            drilling.stage = "calculating_antipode"
            await session.commit()
            await set_progress(redis, drilling_id, 20, drilling.stage)

            antipode = calculate_antipode(row.latitude, row.longitude)
            drilling.antipode = WKTElement(
                f"POINT({antipode.longitude} {antipode.latitude})", srid=4326
            )
            drilling.status = DrillingStatus.COMPLETED.value
            drilling.progress = 100
            # Land/ocean and nearest-place stages require imported Natural Earth data.
            drilling.stage = "antipode_calculated_geodata_pending"
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
