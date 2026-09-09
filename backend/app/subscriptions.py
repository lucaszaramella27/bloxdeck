from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import premium_required
from app.models import Collection, Game, GameAlert, LaunchHistory, User

SubscriptionResource = Literal["games", "collections", "historyEntries", "alerts"]

FREE_LIMITS: dict[SubscriptionResource, int] = {
    "games": 20,
    "collections": 3,
    "historyEntries": 50,
    "alerts": 3,
}
PREMIUM_LIMITS: dict[SubscriptionResource, int | None] = {
    "games": None,
    "collections": None,
    "historyEntries": None,
    "alerts": None,
}
ACTIVE_PREMIUM_STATUSES = {"ACTIVE", "TRIALING"}


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_premium(user: User) -> bool:
    if user.subscriptionPlan != "PREMIUM":
        return False

    if user.subscriptionStatus not in ACTIVE_PREMIUM_STATUSES:
        return False

    return user.premiumUntil is None or user.premiumUntil > utc_now_naive()


def effective_plan(user: User) -> str:
    return "PREMIUM" if is_premium(user) else "FREE"


def limits_for_user(user: User) -> dict[SubscriptionResource, int | None]:
    return PREMIUM_LIMITS if is_premium(user) else FREE_LIMITS


def subscription_usage(db: Session, user: User) -> dict[SubscriptionResource, int]:
    return {
        "games": int(db.scalar(select(func.count(Game.id))) or 0),
        "collections": int(db.scalar(select(func.count(Collection.id)).where(Collection.userId == user.id)) or 0),
        "historyEntries": int(
            db.scalar(select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id)) or 0
        ),
        "alerts": int(db.scalar(select(func.count(GameAlert.id)).where(GameAlert.userId == user.id)) or 0),
    }


def subscription_to_dto(user: User, usage: dict[SubscriptionResource, int] | None = None) -> dict[str, Any]:
    return {
        "plan": user.subscriptionPlan,
        "status": user.subscriptionStatus,
        "effectivePlan": effective_plan(user),
        "isPremium": is_premium(user),
        "premiumUntil": user.premiumUntil.isoformat() if user.premiumUntil else None,
        "limits": limits_for_user(user),
        "usage": usage,
    }


def require_plan_capacity(user: User, resource: SubscriptionResource, current_count: int) -> None:
    limit = limits_for_user(user)[resource]

    if limit is None or current_count < limit:
        return

    labels = {
        "games": "jogos salvos",
        "collections": "colecoes",
        "historyEntries": "entradas no historico",
        "alerts": "alertas ativos",
    }
    raise premium_required(
        f"Limite do plano Free atingido: {limit} {labels[resource]}. Premium libera uso ilimitado."
    )


def trim_history_for_plan(db: Session, user: User) -> None:
    limit = limits_for_user(user)["historyEntries"]

    if limit is None:
        return

    old_entries = list(
        db.scalars(
            select(LaunchHistory)
            .where(LaunchHistory.userId == user.id)
            .order_by(LaunchHistory.createdAt.desc())
            .offset(limit)
        ).all()
    )

    for entry in old_entries:
        db.delete(entry)
