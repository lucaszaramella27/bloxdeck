"""initial bloxdeck schema

Revision ID: 202607010001
Revises:
Create Date: 2026-07-01
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607010001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.execute(
        """
        DO $$
        BEGIN
          CREATE TYPE "CollectionKind" AS ENUM (
            'PLAY_LATER',
            'WITH_FRIENDS',
            'GRIND',
            'COMPETITIVE',
            'CUSTOM'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          CREATE TYPE "ThemePreference" AS ENUM ('DARK', 'SYSTEM');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "handle" TEXT NOT NULL,
          "displayName" TEXT NOT NULL,
          "avatarUrl" TEXT,
          "robloxUserId" TEXT,
          "robloxUsername" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User" ("handle")')
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "User_robloxUserId_key" '
        'ON "User" ("robloxUserId") WHERE "robloxUserId" IS NOT NULL'
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "Game" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "placeId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "imageUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Game_placeId_key" ON "Game" ("placeId")')
    op.execute('CREATE INDEX IF NOT EXISTS "Game_name_idx" ON "Game" ("name")')

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "Favorite" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "gameId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Favorite_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Favorite_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_gameId_key" ON "Favorite" ("userId", "gameId")'
    )
    op.execute('CREATE INDEX IF NOT EXISTS "Favorite_gameId_idx" ON "Favorite" ("gameId")')

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "Collection" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" "CollectionKind" NOT NULL DEFAULT 'CUSTOM',
          "description" TEXT,
          "color" TEXT NOT NULL DEFAULT '#38bdf8',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Collection_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "Collection_userId_name_key" ON "Collection" ("userId", "name")'
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "CollectionGame" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "collectionId" TEXT NOT NULL,
          "gameId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CollectionGame_collectionId_fkey"
            FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "CollectionGame_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "CollectionGame_collectionId_gameId_key" '
        'ON "CollectionGame" ("collectionId", "gameId")'
    )
    op.execute('CREATE INDEX IF NOT EXISTS "CollectionGame_gameId_idx" ON "CollectionGame" ("gameId")')

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "LaunchHistory" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "gameId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LaunchHistory_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "LaunchHistory_gameId_fkey"
            FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS "LaunchHistory_userId_createdAt_idx" '
        'ON "LaunchHistory" ("userId", "createdAt")'
    )
    op.execute('CREATE INDEX IF NOT EXISTS "LaunchHistory_gameId_idx" ON "LaunchHistory" ("gameId")')

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "AppSettings" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "theme" "ThemePreference" NOT NULL DEFAULT 'DARK',
          "accentColor" TEXT NOT NULL DEFAULT '#38bdf8',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AppSettings_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_userId_key" ON "AppSettings" ("userId")')


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS "AppSettings" CASCADE')
    op.execute('DROP TABLE IF EXISTS "LaunchHistory" CASCADE')
    op.execute('DROP TABLE IF EXISTS "CollectionGame" CASCADE')
    op.execute('DROP TABLE IF EXISTS "Collection" CASCADE')
    op.execute('DROP TABLE IF EXISTS "Favorite" CASCADE')
    op.execute('DROP TABLE IF EXISTS "Game" CASCADE')
    op.execute('DROP TABLE IF EXISTS "User" CASCADE')
    op.execute('DROP TYPE IF EXISTS "ThemePreference"')
    op.execute('DROP TYPE IF EXISTS "CollectionKind"')
