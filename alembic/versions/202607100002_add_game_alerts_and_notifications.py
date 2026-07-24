"""add game alerts and notifications

Revision ID: 202607100002
Revises: 202607100001
Create Date: 2026-07-10
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607100002"
down_revision: Union[str, None] = "202607100001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "GameAlert" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "gameId" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "threshold" INTEGER,
          "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
          "lastObservedValue" INTEGER,
          "lastObservedUpdatedAt" TIMESTAMP(3),
          "lastTriggeredAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GameAlert_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "GameAlert_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "GameAlert_userId_gameId_kind_key" '
        'ON "GameAlert" ("userId", "gameId", "kind")'
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS "GameAlert_userId_enabled_idx" '
        'ON "GameAlert" ("userId", "enabled")'
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "gameId" TEXT,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Notification_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" '
        'ON "Notification" ("userId", "createdAt")'
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS "Notification" CASCADE')
    op.execute('DROP TABLE IF EXISTS "GameAlert" CASCADE')
