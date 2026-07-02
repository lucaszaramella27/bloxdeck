"""ensure timestamp defaults

Revision ID: 202607010002
Revises: 202607010001
Create Date: 2026-07-01
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607010002"
down_revision: Union[str, None] = "202607010001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "User",
    "Game",
    "Favorite",
    "Collection",
    "CollectionGame",
    "LaunchHistory",
    "AppSettings",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP')
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP')


def downgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN "createdAt" DROP DEFAULT')
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN "updatedAt" DROP DEFAULT')
