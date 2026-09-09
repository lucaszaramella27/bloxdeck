from __future__ import annotations

from fastapi import APIRouter, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import iso, plain_game_to_dto
from app.errors import not_found
from app.models import Game, LaunchHistory
from app.roblox import get_roblox_snapshot_for_place, get_roblox_snapshots_for_places
from app.subscriptions import trim_history_for_plan, utc_now_naive

router = APIRouter()


def launch_counts_by_game(db: Session, user_id: str) -> dict[str, int]:
    rows = db.execute(
        select(LaunchHistory.gameId, func.count(LaunchHistory.id))
        .where(LaunchHistory.userId == user_id)
        .group_by(LaunchHistory.gameId)
    ).all()

    return {game_id: int(count) for game_id, count in rows}


@router.get("/history")
async def get_history(db: DbSession, limit: int = Query(default=30, gt=0, le=100)) -> dict[str, list[dict]]:
    user = ensure_local_user(db)
    history = list(
        db.scalars(
            select(LaunchHistory)
            .where(LaunchHistory.userId == user.id)
            .order_by(LaunchHistory.createdAt.desc())
            .limit(limit)
        ).all()
    )
    counts = launch_counts_by_game(db, user.id)
    snapshots = await get_roblox_snapshots_for_places([item.game.placeId for item in history])

    return {
        "data": [
            {
                "id": item.id,
                "createdAt": iso(item.createdAt),
                "gameLaunchCount": counts.get(item.gameId, 0),
                "game": plain_game_to_dto(item.game, roblox=snapshots.get(item.game.placeId)),
            }
            for item in history
        ]
    }


@router.post("/history/{game_id}", status_code=201)
async def record_launch(game_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    history = db.scalar(
        select(LaunchHistory)
        .where(LaunchHistory.userId == user.id, LaunchHistory.gameId == game_id)
        .order_by(LaunchHistory.createdAt.desc())
    )

    if history is None:
        history = LaunchHistory(userId=user.id, gameId=game_id)
        db.add(history)
    else:
        history.createdAt = utc_now_naive()

    db.commit()
    db.refresh(history)
    trim_history_for_plan(db, user)
    db.commit()
    game_launch_count = db.scalar(
        select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id, LaunchHistory.gameId == game_id)
    )
    roblox = await get_roblox_snapshot_for_place(history.game.placeId)

    return {
        "data": {
            "id": history.id,
            "createdAt": iso(history.createdAt),
            "gameLaunchCount": int(game_launch_count or 0),
            "game": plain_game_to_dto(history.game, roblox=roblox),
        }
    }


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(db: DbSession) -> None:
    user = ensure_local_user(db)
    db.execute(delete(LaunchHistory).where(LaunchHistory.userId == user.id))
    db.commit()


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_entry(history_id: str, db: DbSession) -> None:
    user = ensure_local_user(db)
    history = db.get(LaunchHistory, history_id)

    if history is None or history.userId != user.id:
        raise not_found("Histórico não encontrado")

    db.delete(history)
    db.commit()
