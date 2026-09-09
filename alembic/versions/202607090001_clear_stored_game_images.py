"""clear stored game image urls

Revision ID: 202607090001
Revises: 202607020001
Create Date: 2026-07-09
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607090001"
down_revision: Union[str, None] = "202607020001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('UPDATE "Game" SET "imageUrl" = NULL WHERE "imageUrl" IS NOT NULL')


def downgrade() -> None:
    pass
