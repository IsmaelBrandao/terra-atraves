"""Import selected Natural Earth shapefiles into PostGIS.

The command is explicit and transactional: all four datasets are validated
before existing Natural Earth rows are replaced. It never downloads data.
"""

import argparse
import asyncio
import json
import logging
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import shapefile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.core.config import get_settings

LOGGER = logging.getLogger("natural-earth-import")
BATCH_SIZE = 250


@dataclass(frozen=True)
class Dataset:
    basename: str
    table: str
    shape_types: frozenset[int]
    row_factory: Callable[[str, dict[str, Any], str], dict[str, Any]]
    insert_sql: str
    explode_multipolygons: bool = False


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return None if not normalized or normalized == "-99" else normalized


def first_value(properties: dict[str, Any], *names: str) -> str | None:
    for name in names:
        value = clean_text(properties.get(name))
        if value is not None:
            return value
    return None


def integer_value(value: Any) -> int | None:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def land_row(feature_key: str, properties: dict[str, Any], geometry: str) -> dict[str, Any]:
    return {
        "feature_key": feature_key,
        "name": first_value(properties, "NAME", "FEATURECLA"),
        "geometry": geometry,
    }


def country_row(feature_key: str, properties: dict[str, Any], geometry: str) -> dict[str, Any]:
    name = first_value(properties, "NAME_PT", "NAME", "ADMIN", "NAME_LONG")
    if name is None:
        raise ValueError(f"country {feature_key} has no name")
    return {
        "feature_key": feature_key,
        "name": name,
        "iso_a2": first_value(properties, "ISO_A2_EH", "ISO_A2"),
        "iso_a3": first_value(properties, "ISO_A3_EH", "ISO_A3", "ADM0_A3"),
        "geometry": geometry,
    }


def state_row(feature_key: str, properties: dict[str, Any], geometry: str) -> dict[str, Any]:
    name = first_value(properties, "NAME_PT", "NAME", "NAME_EN")
    return {
        "feature_key": feature_key,
        "name": name,
        "admin": first_value(properties, "ADMIN", "GEONUNIT", "ADM0_NAME"),
        "admin_iso_a3": first_value(properties, "ADM0_A3", "SOV_A3"),
        "iso_3166_2": first_value(properties, "ISO_3166_2", "HASC_1"),
        "geometry": geometry,
    }


def place_row(feature_key: str, properties: dict[str, Any], geometry: str) -> dict[str, Any]:
    name = first_value(properties, "NAMEPAR", "NAME", "NAMEASCII")
    if name is None:
        raise ValueError(f"populated place {feature_key} has no name")
    return {
        "feature_key": feature_key,
        "name": name,
        "country": first_value(properties, "ADM0NAME", "SOV0NAME"),
        "admin1": first_value(properties, "ADM1NAME"),
        "population": integer_value(properties.get("POP_MAX")),
        "geometry": geometry,
    }


POLYGON_GEOMETRY = (
    "ST_ForcePolygonCCW(ST_Multi(ST_CollectionExtract(ST_MakeValid("
    "ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)), 3)))"
)
POINT_GEOMETRY = "ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)"

DATASETS = (
    Dataset(
        basename="ne_10m_land",
        table="natural_earth_land",
        shape_types=frozenset({shapefile.POLYGON, shapefile.POLYGONM, shapefile.POLYGONZ}),
        row_factory=land_row,
        insert_sql=(
            "INSERT INTO natural_earth_land (feature_key, name, geom) "
            f"VALUES (:feature_key, :name, {POLYGON_GEOMETRY})"
        ),
        explode_multipolygons=True,
    ),
    Dataset(
        basename="ne_10m_admin_0_countries",
        table="natural_earth_countries",
        shape_types=frozenset({shapefile.POLYGON, shapefile.POLYGONM, shapefile.POLYGONZ}),
        row_factory=country_row,
        insert_sql=(
            "INSERT INTO natural_earth_countries (feature_key, name, iso_a2, iso_a3, geom) "
            f"VALUES (:feature_key, :name, :iso_a2, :iso_a3, {POLYGON_GEOMETRY})"
        ),
    ),
    Dataset(
        basename="ne_10m_admin_1_states_provinces",
        table="natural_earth_states",
        shape_types=frozenset({shapefile.POLYGON, shapefile.POLYGONM, shapefile.POLYGONZ}),
        row_factory=state_row,
        insert_sql=(
            "INSERT INTO natural_earth_states "
            "(feature_key, name, admin, admin_iso_a3, iso_3166_2, geom) "
            f"VALUES (:feature_key, :name, :admin, :admin_iso_a3, :iso_3166_2, {POLYGON_GEOMETRY})"
        ),
    ),
    Dataset(
        basename="ne_10m_populated_places",
        table="natural_earth_populated_places",
        shape_types=frozenset({shapefile.POINT, shapefile.POINTM, shapefile.POINTZ}),
        row_factory=place_row,
        insert_sql=(
            "INSERT INTO natural_earth_populated_places "
            "(feature_key, name, country, admin1, population, geom) "
            f"VALUES (:feature_key, :name, :country, :admin1, :population, {POINT_GEOMETRY})"
        ),
    ),
)


def locate_dataset(source: Path, dataset: Dataset) -> Path:
    matches = list(source.rglob(f"{dataset.basename}.shp"))
    if len(matches) != 1:
        raise ValueError(
            f"expected exactly one {dataset.basename}.shp below {source}, found {len(matches)}"
        )
    shapefile_path = matches[0]
    for suffix in (".shp", ".shx", ".dbf", ".prj"):
        companion = shapefile_path.with_suffix(suffix)
        if not companion.is_file() or companion.stat().st_size == 0:
            raise ValueError(f"missing or empty Natural Earth file: {companion}")
    projection = shapefile_path.with_suffix(".prj").read_text(encoding="utf-8").upper()
    if "WGS_1984" not in projection and "WGS 84" not in projection:
        raise ValueError(f"dataset is not declared as WGS84/SRID 4326: {shapefile_path}")
    with shapefile.Reader(str(shapefile_path)) as reader:
        if reader.shapeType not in dataset.shape_types:
            raise ValueError(
                f"unexpected shape type {reader.shapeType} for {dataset.basename}"
            )
        if reader.numRecords == 0:
            raise ValueError(f"dataset has no records: {shapefile_path}")
    return shapefile_path


def dataset_rows(path: Path, dataset: Dataset) -> Iterator[dict[str, Any]]:
    with shapefile.Reader(str(path), encoding="utf-8") as reader:
        for index, shape_record in enumerate(reader.iterShapeRecords(), start=1):
            if shape_record.shape.shapeType not in dataset.shape_types:
                raise ValueError(f"invalid geometry at {path}:{index}")
            properties = {
                key.upper(): value for key, value in shape_record.record.as_dict().items()
            }
            geometry = shape_record.shape.__geo_interface__
            if dataset.explode_multipolygons and geometry["type"] == "MultiPolygon":
                geometries = [
                    {"type": "Polygon", "coordinates": coordinates}
                    for coordinates in geometry["coordinates"]
                ]
            else:
                geometries = [geometry]
            for part, part_geometry in enumerate(geometries, start=1):
                serialized = json.dumps(part_geometry, separators=(",", ":"))
                feature_key = f"{dataset.basename}:{index}:{part}"
                yield dataset.row_factory(feature_key, properties, serialized)


async def import_dataset(connection: AsyncConnection, path: Path, dataset: Dataset) -> int:
    count = 0
    batch: list[dict[str, Any]] = []
    statement = text(dataset.insert_sql)
    for row in dataset_rows(path, dataset):
        batch.append(row)
        if len(batch) == BATCH_SIZE:
            await connection.execute(statement, batch)
            count += len(batch)
            batch.clear()
    if batch:
        await connection.execute(statement, batch)
        count += len(batch)
    return count


def validate_datasets(source: Path) -> dict[str, Path]:
    if not source.is_dir():
        raise ValueError(f"source directory not found: {source}")
    return {dataset.basename: locate_dataset(source, dataset) for dataset in DATASETS}


async def run_import(paths: dict[str, Path], database_url: str) -> dict[str, int]:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    counts: dict[str, int] = {}
    try:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "TRUNCATE natural_earth_land, natural_earth_countries, "
                    "natural_earth_states, natural_earth_populated_places RESTART IDENTITY"
                )
            )
            for dataset in DATASETS:
                count = await import_dataset(connection, paths[dataset.basename], dataset)
                counts[dataset.table] = count
                LOGGER.info("%s: %d records imported", dataset.table, count)
            for dataset in DATASETS:
                await connection.execute(text(f"ANALYZE {dataset.table}"))
    finally:
        await engine.dispose()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Natural Earth shapefiles into PostGIS")
    parser.add_argument("source", type=Path, help="Directory containing extracted datasets")
    parser.add_argument("--database-url", default=get_settings().database_url)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        paths = validate_datasets(args.source.resolve())
        counts = asyncio.run(run_import(paths, args.database_url))
    except (OSError, ValueError, shapefile.ShapefileException) as exc:
        raise SystemExit(f"Natural Earth import failed: {exc}") from exc
    LOGGER.info("import completed: %d total records", sum(counts.values()))


if __name__ == "__main__":
    main()
