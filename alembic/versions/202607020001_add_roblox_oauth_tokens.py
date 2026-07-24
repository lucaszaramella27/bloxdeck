"""add roblox oauth tokens

Revision ID: 202607020001
Revises: 202607010003
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607020001"
down_revision: Union[str, None] = "202607010003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "RobloxOAuthToken" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "accessToken" TEXT NOT NULL,
          "refreshToken" TEXT,
          "tokenType" TEXT,
          "scopes" TEXT,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RobloxOAuthToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS "RobloxOAuthToken_userId_key" ON "RobloxOAuthToken" ("userId")')


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS "RobloxOAuthToken" CASCADE')
