from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import parse_roblox_datetime, utc_now_naive
from app.dto import game_to_dto, iso, plain_game_to_dto
from app.models import Game, GameAlert, Notification, User
from app.roblox import RobloxGameSnapshot


def alert_to_dto(alert: GameAlert, snapshot: RobloxGameSnapshot | None = None) -> dict[str, Any]:
    return {
        "id": alert.id,
        "gameId": alert.gameId,
        "kind": alert.kind,
        "threshold": alert.threshold,
        "enabled": alert.enabled,
        "lastTriggeredAt": iso(alert.lastTriggeredAt),
        "createdAt": iso(alert.createdAt),
        "updatedAt": iso(alert.updatedAt),
        "game": game_to_dto(alert.game, roblox=snapshot),
    }


def notification_to_dto(
    notification: Notification,
    snapshot: RobloxGameSnapshot | None = None,
) -> dict[str, Any]:
    return {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "readAt": iso(notification.readAt),
        "createdAt": iso(notification.createdAt),
        "game": plain_game_to_dto(notification.game, roblox=snapshot) if notification.game else None,
    }


def evaluate_game_alerts(
    db: Session,
    user: User,
    games: list[Game],
    snapshots_by_game_id: dict[str, RobloxGameSnapshot | None],
) -> None:
    game_by_id = {game.id: game for game in games}
    alerts = list(
        db.scalars(
            select(GameAlert).where(GameAlert.userId == user.id, GameAlert.enabled.is_(True))
        ).all()
    )
    now = utc_now_naive()
    changed = False

    for alert in alerts:
        game = game_by_id.get(alert.gameId)
        snapshot = snapshots_by_game_id.get(alert.gameId)

        if game is None or snapshot is None:
            continue

        triggered = False
        title = ""
        message = ""

        if alert.kind == "GAME_UPDATE":
            current_updated_at = parse_roblox_datetime(snapshot.updatedAt)

            if current_updated_at is None:
                continue

            if alert.lastObservedUpdatedAt and current_updated_at > alert.lastObservedUpdatedAt:
                triggered = True
                title = f"{snapshot.name} foi atualizado"
                message = "Uma nova atualização foi detectada desde o último acompanhamento"

            if alert.lastObservedUpdatedAt != current_updated_at:
                alert.lastObservedUpdatedAt = current_updated_at
                changed = True

        elif alert.kind == "PLAYER_THRESHOLD" and snapshot.playing is not None and alert.threshold:
            previous = alert.lastObservedValue

            if previous is not None and previous < alert.threshold <= snapshot.playing:
                triggered = True
                title = f"{snapshot.name} atingiu seu alerta"
                message = f"O jogo chegou a {snapshot.playing:,} jogadores simultâneos".replace(",", ".")

            if previous != snapshot.playing:
                alert.lastObservedValue = snapshot.playing
                changed = True

        if triggered:
            alert.lastTriggeredAt = now
            db.add(
                Notification(
                    userId=user.id,
                    gameId=game.id,
                    type=alert.kind,
                    title=title,
                    message=message,
                    createdAt=now,
                )
            )
            changed = True

    if changed:
        db.commit()
