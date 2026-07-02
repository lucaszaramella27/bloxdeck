from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import game_to_dto, iso, plain_game_to_dto
from app.models import Collection, Favorite, Game, LaunchHistory
from app.roblox import RobloxGameSnapshot, get_roblox_snapshots_for_places

router = APIRouter()


@router.get("/stats")
async def get_stats(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    tracked_games = list(db.scalars(select(Game).order_by(Game.updatedAt.desc(), Game.name.asc())).all())
    game_ids = [game.id for game in tracked_games]
    favorites = int(db.scalar(select(func.count(Favorite.id)).where(Favorite.userId == user.id)) or 0)
    collections = int(db.scalar(select(func.count(Collection.id)).where(Collection.userId == user.id)) or 0)
    launches = int(db.scalar(select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id)) or 0)
    roblox_snapshots = await get_roblox_snapshots_for_places([game.placeId for game in tracked_games])
    snapshot_by_game_id = {game.id: roblox_snapshots.get(game.placeId) for game in tracked_games}
    live_snapshots = [snapshot for snapshot in snapshot_by_game_id.values() if snapshot is not None]
    recent = list(
        db.scalars(
            select(LaunchHistory).where(LaunchHistory.userId == user.id).order_by(LaunchHistory.createdAt.desc()).limit(5)
        ).all()
    )
    top_groups = db.execute(
        select(LaunchHistory.gameId, func.count(LaunchHistory.id).label("launches"))
        .where(LaunchHistory.userId == user.id)
        .group_by(LaunchHistory.gameId)
        .order_by(func.count(LaunchHistory.id).desc())
        .limit(5)
    ).all()
    launch_counts = {
        game_id: int(count)
        for game_id, count in db.execute(
            select(LaunchHistory.gameId, func.count(LaunchHistory.id))
            .where(LaunchHistory.userId == user.id, LaunchHistory.gameId.in_(game_ids))
            .group_by(LaunchHistory.gameId)
        ).all()
    } if game_ids else {}
    favorite_ids = set(
        db.scalars(select(Favorite.gameId).where(Favorite.userId == user.id, Favorite.gameId.in_(game_ids))).all()
    ) if game_ids else set()
    game_by_id = {
        game.id: game
        for game in db.scalars(select(Game).where(Game.id.in_([row[0] for row in top_groups]))).all()
    }
    trending_games = sorted(
        tracked_games,
        key=lambda game: (
            (snapshot_by_game_id.get(game.id).playing if snapshot_by_game_id.get(game.id) else None) or 0,
            (snapshot_by_game_id.get(game.id).visits if snapshot_by_game_id.get(game.id) else None) or 0,
        ),
        reverse=True,
    )[:5]

    def sum_snapshot_number(field: str) -> int:
        total = 0

        for snapshot in live_snapshots:
            value = getattr(snapshot, field)

            if isinstance(value, int):
                total += value

        return total

    synced_at = max((snapshot.syncedAt for snapshot in live_snapshots), default=None)

    def game_snapshot(game: Game) -> RobloxGameSnapshot | None:
        return snapshot_by_game_id.get(game.id)

    return {
        "data": {
            "totals": {
                "games": len(tracked_games),
                "favorites": favorites,
                "collections": collections,
                "launches": launches,
            },
            "roblox": {
                "onlinePlayers": sum_snapshot_number("playing"),
                "totalVisits": sum_snapshot_number("visits"),
                "totalFavorites": sum_snapshot_number("favoritedCount"),
                "trackedGames": len(tracked_games),
                "snapshots": len(live_snapshots),
                "unavailable": max(len(tracked_games) - len(live_snapshots), 0),
                "syncedAt": synced_at,
                "trendingGames": [
                    game_to_dto(
                        game,
                        is_favorite=game.id in favorite_ids,
                        launch_count=launch_counts.get(game.id, 0),
                        roblox=game_snapshot(game),
                    )
                    for game in trending_games
                    if game_snapshot(game) is not None
                ],
            },
            "recent": [
                {
                    "id": item.id,
                    "createdAt": iso(item.createdAt),
                    "game": plain_game_to_dto(item.game, roblox=game_snapshot(item.game)),
                }
                for item in recent
            ],
            "topGames": [
                {
                    "game": plain_game_to_dto(game_by_id[game_id], roblox=game_snapshot(game_by_id[game_id])),
                    "launches": int(count),
                }
                for game_id, count in top_groups
                if game_id in game_by_id
            ],
        }
    }
