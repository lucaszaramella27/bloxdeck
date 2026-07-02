from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import iso, plain_game_to_dto
from app.errors import not_found
from app.models import Game, LaunchHistory

router = APIRouter()


def launch_counts_by_game(db: Session, user_id: str) -> dict[str, int]:
    rows = db.execute(
        select(LaunchHistory.gameId, func.count(LaunchHistory.id))
        .where(LaunchHistory.userId == user_id)
        .group_by(LaunchHistory.gameId)
    ).all()

    return {game_id: int(count) for game_id, count in rows}


@router.get("/history")
def get_history(db: DbSession, limit: int = Query(default=30, gt=0, le=100)) -> dict[str, list[dict]]:
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

    return {
        "data": [
            {
                "id": item.id,
                "createdAt": iso(item.createdAt),
                "gameLaunchCount": counts.get(item.gameId, 0),
                "game": plain_game_to_dto(item.game),
            }
            for item in history
        ]
    }


@router.post("/history/{game_id}", status_code=201)
def record_launch(game_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    history = LaunchHistory(userId=user.id, gameId=game_id)
    db.add(history)
    db.commit()
    db.refresh(history)
    game_launch_count = db.scalar(
        select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id, LaunchHistory.gameId == game_id)
    )

    return {
        "data": {
            "id": history.id,
            "createdAt": iso(history.createdAt),
            "gameLaunchCount": int(game_launch_count or 0),
            "game": plain_game_to_dto(history.game),
        }
    }
