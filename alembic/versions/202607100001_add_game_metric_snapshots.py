"""add game metric snapshots

Revision ID: 202607100001
Revises: 202607090002
Create Date: 2026-07-10
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607100001"
down_revision: Union[str, None] = "202607090002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "GameMetricSnapshot" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "gameId" TEXT NOT NULL,
          "playing" INTEGER,
          "visits" BIGINT,
          "favoritedCount" BIGINT,
          "robloxUpdatedAt" TIMESTAMP(3),
          "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GameMetricSnapshot_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS "GameMetricSnapshot_gameId_capturedAt_idx" '
        'ON "GameMetricSnapshot" ("gameId", "capturedAt")'
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS "GameMetricSnapshot" CASCADE')
