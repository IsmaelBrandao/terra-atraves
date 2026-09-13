"""Download and import the pinned Natural Earth datasets once.

This command is intentionally separate from API and worker startup. Downloads
live only in a temporary directory; the existing importer owns validation and
the transactional, idempotent database replacement.
"""

import argparse
import asyncio
import logging
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from urllib.request import Request, urlopen

from app.core.config import get_settings, normalize_database_url
from scripts.import_natural_earth import DATASETS, run_import, validate_datasets

LOGGER = logging.getLogger("natural-earth-bootstrap")
DOWNLOAD_TIMEOUT_SECONDS = 120
USER_AGENT = "TerraAtraves/0.1 Natural-Earth-bootstrap"


@dataclass(frozen=True)
class NaturalEarthArchive:
    basename: str
    version: str
    url: str


ARCHIVES = (
    NaturalEarthArchive(
        basename="ne_10m_land",
        version="5.1.1",
        url="https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip",
    ),
    NaturalEarthArchive(
        basename="ne_10m_admin_0_countries",
        version="5.1.1",
        url=(
            "https://naturalearth.s3.amazonaws.com/10m_cultural/"
            "ne_10m_admin_0_countries.zip"
        ),
    ),
    NaturalEarthArchive(
        basename="ne_10m_admin_1_states_provinces",
        version="5.1.1",
        url=(
            "https://naturalearth.s3.amazonaws.com/10m_cultural/"
            "ne_10m_admin_1_states_provinces.zip"
        ),
    ),
    NaturalEarthArchive(
        basename="ne_10m_populated_places",
        version="5.1.2",
        url=(
            "https://naturalearth.s3.amazonaws.com/10m_cultural/"
            "ne_10m_populated_places.zip"
        ),
    ),
)


def download_archive(archive: NaturalEarthArchive, destination: Path) -> None:
    LOGGER.info("downloading %s %s", archive.basename, archive.version)
    request = Request(archive.url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
        with destination.open("wb") as output:
            shutil.copyfileobj(response, output)
    if destination.stat().st_size == 0:
        raise ValueError(f"downloaded archive is empty: {archive.url}")


def extract_archive(archive_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    destination_root = destination.resolve()
    with zipfile.ZipFile(archive_path) as archive:
        for member in archive.infolist():
            target = (destination / member.filename).resolve()
            if not target.is_relative_to(destination_root):
                raise ValueError(f"unsafe path in archive {archive_path.name}: {member.filename}")
        archive.extractall(destination)


def ensure_complete_counts(counts: dict[str, int]) -> None:
    empty_tables = [
        dataset.table for dataset in DATASETS if counts.get(dataset.table, 0) <= 0
    ]
    if empty_tables:
        raise ValueError(f"Natural Earth tables are empty after import: {', '.join(empty_tables)}")


async def bootstrap_natural_earth(database_url: str) -> dict[str, int]:
    with tempfile.TemporaryDirectory(prefix="terra-atraves-natural-earth-") as temporary:
        source = Path(temporary)
        for archive in ARCHIVES:
            archive_path = source / f"{archive.basename}.zip"
            download_archive(archive, archive_path)
            extract_archive(archive_path, source / archive.basename)

        paths = validate_datasets(source)
        counts = await run_import(paths, normalize_database_url(database_url))
        ensure_complete_counts(counts)
        return counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download and import the pinned Natural Earth datasets once"
    )
    parser.add_argument("--database-url", default=get_settings().database_url)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        counts = asyncio.run(bootstrap_natural_earth(args.database_url))
    except Exception as exc:
        LOGGER.exception("Natural Earth bootstrap failed")
        raise SystemExit(1) from exc
    LOGGER.info("bootstrap completed: %s", counts)


if __name__ == "__main__":
    main()
