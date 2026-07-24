from __future__ import annotations

from fastapi import APIRouter, Query, Response
from sqlalchemy import func, select, update

from app.activity import parse_roblox_datetime, utc_now_naive
from app.alerting import alert_to_dto, evaluate_game_alerts, notification_to_dto
from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.errors import conflict, not_found
from app.models import Game, GameAlert, Notification
from app.roblox import get_roblox_snapshots_for_places
from app.schemas import CreateGameAlertInput, UpdateGameAlertInput
from app.subscriptions import require_plan_capacity

router = APIRouter(tags=["alerts"])


async def snapshots_for_games(games: list[Game]):
    by_place_id = await get_roblox_snapshots_for_places([game.placeId for game in games])
    return {game.id: by_place_id.get(game.placeId) for game in games}


@router.get("/alerts")
async def get_alerts(db: DbSession, gameId: str | None = None) -> dict[str, list[dict]]:
    user = ensure_local_user(db)
    query = select(GameAlert).where(GameAlert.userId == user.id).order_by(GameAlert.createdAt.desc())

    if gameId:
        query = query.where(GameAlert.gameId == gameId)

    alerts = list(db.scalars(query).all())
    games = list({alert.game.id: alert.game for alert in alerts}.values())
    snapshots = await snapshots_for_games(games)

    return {"data": [alert_to_dto(alert, snapshots.get(alert.gameId)) for alert in alerts]}


@router.post("/alerts", status_code=201)
async def create_alert(body: CreateGameAlertInput, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    game = db.get(Game, body.gameId)

    if game is None:
        raise not_found("Jogo não encontrado")

    existing = db.scalar(
        select(GameAlert).where(
            GameAlert.userId == user.id,
            GameAlert.gameId == game.id,
            GameAlert.kind == body.kind,
        )
    )

    if existing:
        raise conflict("Este alerta já está ativo para o jogo")

    current_alerts = int(
        db.scalar(select(func.count(GameAlert.id)).where(GameAlert.userId == user.id)) or 0
    )
    require_plan_capacity(user, "alerts", current_alerts)
    snapshots = await snapshots_for_games([game])
    snapshot = snapshots.get(game.id)
    alert = GameAlert(
        userId=user.id,
        gameId=game.id,
        kind=body.kind,
        threshold=body.threshold,
        enabled=True,
        lastObservedValue=snapshot.playing if snapshot and body.kind == "PLAYER_THRESHOLD" else None,
        lastObservedUpdatedAt=(
            parse_roblox_datetime(snapshot.updatedAt)
            if snapshot and body.kind == "GAME_UPDATE"
            else None
        ),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return {"data": alert_to_dto(alert, snapshot)}


@router.patch("/alerts/{alert_id}")
def update_alert(alert_id: str, body: UpdateGameAlertInput, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    alert = db.scalar(select(GameAlert).where(GameAlert.id == alert_id, GameAlert.userId == user.id))

    if alert is None:
        raise not_found("Alerta não encontrado")

    alert.enabled = body.enabled
    db.commit()
    db.refresh(alert)

    return {"data": alert_to_dto(alert)}


@router.delete("/alerts/{alert_id}", status_code=204)
def delete_alert(alert_id: str, db: DbSession) -> Response:
    user = ensure_local_user(db)
    alert = db.scalar(select(GameAlert).where(GameAlert.id == alert_id, GameAlert.userId == user.id))

    if alert is None:
        raise not_found("Alerta não encontrado")

    db.delete(alert)
    db.commit()
    return Response(status_code=204)


@router.get("/notifications")
async def get_notifications(
    db: DbSession,
    limit: int = Query(30, ge=1, le=100),
) -> dict[str, dict]:
    user = ensure_local_user(db)
    active_alerts = list(
        db.scalars(
            select(GameAlert).where(GameAlert.userId == user.id, GameAlert.enabled.is_(True))
        ).all()
    )
    alert_games = list({alert.game.id: alert.game for alert in active_alerts}.values())
    alert_snapshots = await snapshots_for_games(alert_games)
    evaluate_game_alerts(db, user, alert_games, alert_snapshots)

    notifications = list(
        db.scalars(
            select(Notification)
            .where(Notification.userId == user.id)
            .order_by(Notification.createdAt.desc())
            .limit(limit)
        ).all()
    )
    notification_games = list(
        {notification.game.id: notification.game for notification in notifications if notification.game}.values()
    )
    notification_snapshots = await snapshots_for_games(notification_games)
    unread = int(
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.userId == user.id,
                Notification.readAt.is_(None),
            )
        )
        or 0
    )

    return {
        "data": {
            "items": [
                notification_to_dto(
                    notification,
                    notification_snapshots.get(notification.gameId) if notification.gameId else None,
                )
                for notification in notifications
            ],
            "unread": unread,
        }
    }


@router.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.userId == user.id,
        )
    )

    if notification is None:
        raise not_found("Notificação não encontrada")

    if notification.readAt is None:
        notification.readAt = utc_now_naive()
        db.commit()
        db.refresh(notification)

    return {"data": notification_to_dto(notification)}


@router.patch("/notifications/read-all", status_code=204)
def read_all_notifications(db: DbSession) -> Response:
    user = ensure_local_user(db)
    db.execute(
        update(Notification)
        .where(Notification.userId == user.id, Notification.readAt.is_(None))
        .values(readAt=utc_now_naive())
    )
    db.commit()
    return Response(status_code=204)
