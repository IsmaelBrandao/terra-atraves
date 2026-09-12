"""Add Natural Earth tables and spatial drilling results.

Revision ID: 0003
Revises: 0002
"""

import geoalchemy2
import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def polygon_column() -> sa.Column[object]:
    return sa.Column(
        "geom",
        geoalchemy2.Geometry("MULTIPOLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )


def upgrade() -> None:
    op.create_table(
        "natural_earth_land",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("feature_key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=True),
        polygon_column(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "natural_earth_countries",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("feature_key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("iso_a2", sa.String(2), nullable=True),
        sa.Column("iso_a3", sa.String(3), nullable=True),
        polygon_column(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "natural_earth_states",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("feature_key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=True),
        sa.Column("admin", sa.String(200), nullable=True),
        sa.Column("admin_iso_a3", sa.String(3), nullable=True),
        sa.Column("iso_3166_2", sa.String(16), nullable=True),
        polygon_column(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "natural_earth_populated_places",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("feature_key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("country", sa.String(200), nullable=True),
        sa.Column("admin1", sa.String(200), nullable=True),
        sa.Column("population", sa.BigInteger(), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geometry("POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    for table in (
        "natural_earth_land",
        "natural_earth_countries",
        "natural_earth_states",
        "natural_earth_populated_places",
    ):
        op.create_index(f"ix_{table}_geom", table, ["geom"], postgresql_using="gist")
    op.execute(
        "CREATE INDEX ix_natural_earth_land_geography "
        "ON natural_earth_land USING gist ((geom::geography))"
    )
    op.execute(
        "CREATE INDEX ix_natural_earth_populated_places_geography "
        "ON natural_earth_populated_places USING gist ((geom::geography))"
    )

    op.add_column("drillings", sa.Column("destination_country_name", sa.String(200)))
    op.add_column("drillings", sa.Column("destination_country_iso_a2", sa.String(2)))
    op.add_column("drillings", sa.Column("destination_country_iso_a3", sa.String(3)))
    op.add_column("drillings", sa.Column("destination_state_name", sa.String(200)))
    op.add_column("drillings", sa.Column("destination_state_admin", sa.String(200)))
    op.add_column("drillings", sa.Column("nearest_place_country", sa.String(200)))
    op.add_column(
        "drillings", sa.Column("nearest_place_point", geoalchemy2.Geometry("POINT", srid=4326))
    )
    op.add_column("drillings", sa.Column("nearest_land_distance_m", sa.Float()))
    op.add_column(
        "drillings", sa.Column("nearest_land_point", geoalchemy2.Geometry("POINT", srid=4326))
    )
    op.add_column("drillings", sa.Column("nearest_land_country_name", sa.String(200)))
    op.add_column("drillings", sa.Column("nearest_land_country_iso_a2", sa.String(2)))
    op.add_column("drillings", sa.Column("nearest_land_country_iso_a3", sa.String(3)))
    op.add_column("drillings", sa.Column("nearest_land_place", sa.String(500)))
    op.add_column("drillings", sa.Column("nearest_land_place_country", sa.String(200)))
    op.add_column(
        "drillings",
        sa.Column("nearest_land_place_point", geoalchemy2.Geometry("POINT", srid=4326)),
    )
    op.add_column("drillings", sa.Column("nearest_land_place_distance_m", sa.Float()))
    op.create_check_constraint(
        "ck_drillings_nearest_place_distance_nonnegative",
        "drillings",
        "nearest_place_distance_m IS NULL OR nearest_place_distance_m >= 0",
    )
    op.create_check_constraint(
        "ck_drillings_nearest_land_distance_nonnegative",
        "drillings",
        "nearest_land_distance_m IS NULL OR nearest_land_distance_m >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_drillings_nearest_land_distance_nonnegative", "drillings")
    op.drop_constraint("ck_drillings_nearest_place_distance_nonnegative", "drillings")
    for column in (
        "nearest_land_place_distance_m",
        "nearest_land_place_point",
        "nearest_land_place_country",
        "nearest_land_place",
        "nearest_land_country_iso_a3",
        "nearest_land_country_iso_a2",
        "nearest_land_country_name",
        "nearest_land_point",
        "nearest_land_distance_m",
        "nearest_place_point",
        "nearest_place_country",
        "destination_state_admin",
        "destination_state_name",
        "destination_country_iso_a3",
        "destination_country_iso_a2",
        "destination_country_name",
    ):
        op.drop_column("drillings", column)

    op.drop_index(
        "ix_natural_earth_populated_places_geography",
        table_name="natural_earth_populated_places",
    )
    op.drop_index("ix_natural_earth_land_geography", table_name="natural_earth_land")
    for table in (
        "natural_earth_populated_places",
        "natural_earth_states",
        "natural_earth_countries",
        "natural_earth_land",
    ):
        op.drop_index(f"ix_{table}_geom", table_name=table)
        op.drop_table(table)
