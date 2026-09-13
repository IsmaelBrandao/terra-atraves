from pathlib import Path

import pytest

from scripts import bootstrap_natural_earth as bootstrap_module
from scripts.import_natural_earth import DATASETS


def test_bootstrap_reuses_importer_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    downloaded: list[str] = []
    imported_paths: dict[str, Path] = {}
    temporary_source: Path | None = None

    def fake_download(archive: bootstrap_module.NaturalEarthArchive, destination: Path) -> None:
        downloaded.append(archive.basename)
        destination.touch()

    def fake_extract(archive_path: Path, destination: Path) -> None:
        destination.mkdir()

    def fake_validate(source: Path) -> dict[str, Path]:
        nonlocal temporary_source
        temporary_source = source
        return {dataset.basename: source / dataset.basename for dataset in DATASETS}

    async def fake_import(paths: dict[str, Path], database_url: str) -> dict[str, int]:
        imported_paths.update(paths)
        assert database_url == "postgresql+asyncpg://user:password@host/database"
        return {dataset.table: 1 for dataset in DATASETS}

    monkeypatch.setattr(bootstrap_module, "download_archive", fake_download)
    monkeypatch.setattr(bootstrap_module, "extract_archive", fake_extract)
    monkeypatch.setattr(bootstrap_module, "validate_datasets", fake_validate)
    monkeypatch.setattr(bootstrap_module, "run_import", fake_import)

    counts = __import__("asyncio").run(
        bootstrap_module.bootstrap_natural_earth("postgresql://user:password@host/database")
    )

    assert downloaded == [archive.basename for archive in bootstrap_module.ARCHIVES]
    assert set(imported_paths) == {dataset.basename for dataset in DATASETS}
    assert counts == {dataset.table: 1 for dataset in DATASETS}
    assert temporary_source is not None
    assert not temporary_source.exists()


def test_bootstrap_rejects_an_empty_import() -> None:
    counts = {dataset.table: 1 for dataset in DATASETS}
    counts[DATASETS[0].table] = 0

    with pytest.raises(ValueError, match=DATASETS[0].table):
        bootstrap_module.ensure_complete_counts(counts)
