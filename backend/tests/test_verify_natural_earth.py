import pytest

from scripts.import_natural_earth import DATASETS
from scripts.verify_natural_earth import ensure_complete_counts


def test_verification_accepts_non_empty_tables() -> None:
    ensure_complete_counts({dataset.table: 1 for dataset in DATASETS})


def test_verification_lists_every_empty_table() -> None:
    with pytest.raises(ValueError, match="natural_earth_land"):
        ensure_complete_counts({})
