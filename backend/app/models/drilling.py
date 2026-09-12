import uuid
from datetime import datetime
from enum import StrEnum

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DrillingStatus(StrEnum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Drilling(Base):
    __tablename__ = "drillings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    origin: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    antipode: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    status: Mapped[str] = mapped_column(String(20), default=DrillingStatus.QUEUED.value)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    stage: Mapped[str] = mapped_column(String(80), default="queued")
    origin_label: Mapped[str | None] = mapped_column(String(500))
    destination_label: Mapped[str | None] = mapped_column(String(500))
    destination_is_land: Mapped[bool | None] = mapped_column(Boolean)
    nearest_place: Mapped[str | None] = mapped_column(String(500))
    nearest_place_distance_m: Mapped[float | None] = mapped_column(Float)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
