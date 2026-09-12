from pathlib import Path

import pytest

from scripts.import_natural_earth import clean_text, validate_datasets


def test_clean_text_normalizes_natural_earth_nulls() -> None:
    assert clean_text(" -99 ") is None
    assert clean_text("  Brasil  ") == "Brasil"


def test_import_validation_fails_clearly_when_files_are_missing(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="expected exactly one ne_10m_land.shp"):
        validate_datasets(tmp_path)
