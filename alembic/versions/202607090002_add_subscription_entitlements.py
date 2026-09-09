"""add subscription entitlements

Revision ID: 202607090002
Revises: 202607090001
Create Date: 2026-07-09
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202607090002"
down_revision: Union[str, None] = "202607090001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT NOT NULL DEFAULT \'FREE\'')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT \'INACTIVE\'')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3)')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionProvider" TEXT')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionCustomerId" TEXT')
    op.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExternalId" TEXT')


def downgrade() -> None:
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionExternalId"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionCustomerId"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionProvider"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "premiumUntil"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionStatus"')
    op.execute('ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionPlan"')
