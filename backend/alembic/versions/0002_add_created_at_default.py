"""Add database default for drilling creation timestamp."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("drillings", "created_at", server_default=sa.func.now())


def downgrade() -> None:
    op.alter_column("drillings", "created_at", server_default=None)
