"""Natural Earth import command placeholder.

The production importer will load land, admin boundaries and populated places
into dedicated PostGIS tables. It deliberately does not download data at startup.
See docs/architecture.md for the intended datasets and import workflow.
"""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a Natural Earth source directory")
    parser.add_argument("source", type=Path, help="Directory containing extracted datasets")
    args = parser.parse_args()
    if not args.source.is_dir():
        raise SystemExit(f"Source directory not found: {args.source}")
    raise SystemExit(
        "Import schema is prepared but dataset ingestion is pending. "
        "No files or database records were changed."
    )


if __name__ == "__main__":
    main()
