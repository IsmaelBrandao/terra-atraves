from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NaturalEarthLand(Base):
    __tablename__ = "natural_earth_land"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    feature_key: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(200))
    geom: Mapped[object] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
    )


class NaturalEarthCountry(Base):
    __tablename__ = "natural_earth_countries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    feature_key: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    iso_a2: Mapped[str | None] = mapped_column(String(2))
    iso_a3: Mapped[str | None] = mapped_column(String(3))
    geom: Mapped[object] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
    )


class NaturalEarthState(Base):
    __tablename__ = "natural_earth_states"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    feature_key: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(200))
    admin: Mapped[str | None] = mapped_column(String(200))
    admin_iso_a3: Mapped[str | None] = mapped_column(String(3))
    iso_3166_2: Mapped[str | None] = mapped_column(String(16))
    geom: Mapped[object] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
    )


class NaturalEarthPopulatedPlace(Base):
    __tablename__ = "natural_earth_populated_places"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    feature_key: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str | None] = mapped_column(String(200))
    admin1: Mapped[str | None] = mapped_column(String(200))
    population: Mapped[int | None] = mapped_column(BigInteger)
    geom: Mapped[object] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False), nullable=False
    )
