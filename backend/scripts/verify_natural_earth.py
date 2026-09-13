"""Verify that every required Natural Earth table has data."""

import argparse
import asyncio
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings, normalize_database_url
from scripts.import_natural_earth import DATASETS

LOGGER = logging.getLogger("natural-earth-verify")


def ensure_complete_counts(counts: dict[str, int]) -> None:
    empty_tables = [
        dataset.table for dataset in DATASETS if counts.get(dataset.table, 0) <= 0
    ]
    if empty_tables:
        raise ValueError(f"Natural Earth tables are empty: {', '.join(empty_tables)}")


async def fetch_counts(database_url: str) -> dict[str, int]:
    engine = create_async_engine(normalize_database_url(database_url), pool_pre_ping=True)
    try:
        async with engine.connect() as connection:
            counts = {}
            for dataset in DATASETS:
                result = await connection.execute(text(f"SELECT COUNT(*) FROM {dataset.table}"))
                counts[dataset.table] = int(result.scalar_one())
            return counts
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify Natural Earth row counts")
    parser.add_argument("--database-url", default=get_settings().database_url)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        counts = asyncio.run(fetch_counts(args.database_url))
        ensure_complete_counts(counts)
    except Exception as exc:
        LOGGER.exception("Natural Earth verification failed")
        raise SystemExit(1) from exc
    for table, count in counts.items():
        LOGGER.info("%s: %d", table, count)


if __name__ == "__main__":
    main()
