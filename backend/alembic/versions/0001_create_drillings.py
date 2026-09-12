"""Create PostGIS extension and drillings table."""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "drillings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("origin", geoalchemy2.Geometry("POINT", srid=4326), nullable=False),
        sa.Column("antipode", geoalchemy2.Geometry("POINT", srid=4326), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stage", sa.String(length=80), nullable=False),
        sa.Column("origin_label", sa.String(length=500), nullable=True),
        sa.Column("destination_label", sa.String(length=500), nullable=True),
        sa.Column("destination_is_land", sa.Boolean(), nullable=True),
        sa.Column("nearest_place", sa.String(length=500), nullable=True),
        sa.Column("nearest_place_distance_m", sa.Float(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_drillings_origin", "drillings", ["origin"], postgresql_using="gist")
    op.create_index("ix_drillings_antipode", "drillings", ["antipode"], postgresql_using="gist")
    op.create_check_constraint(
        "ck_drillings_progress_range", "drillings", "progress >= 0 AND progress <= 100"
    )


def downgrade() -> None:
    op.drop_table("drillings")
