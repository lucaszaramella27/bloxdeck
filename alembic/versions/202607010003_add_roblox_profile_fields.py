"""add roblox profile fields

Revision ID: 202607010003
Revises: 202607010002
Create Date: 2026-07-01
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607010003"
down_revision: Union[str, None] = "202607010002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "robloxUserId" TEXT')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "robloxUsername" TEXT')
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "User_robloxUserId_key" '
        'ON "User" ("robloxUserId") WHERE "robloxUserId" IS NOT NULL'
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS "User_robloxUserId_key"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "robloxUsername"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "robloxUserId"')
