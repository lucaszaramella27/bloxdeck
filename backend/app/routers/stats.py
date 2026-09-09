from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter
from sqlalchemy import distinct, func, select

from app.activity import parse_roblox_datetime, record_game_metrics, utc_now_naive
from app.alerting import evaluate_game_alerts
from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import game_to_dto, iso, plain_game_to_dto
from app.models import Collection, Favorite, Game, GameAlert, LaunchHistory
from app.roblox import RobloxGameSnapshot, get_roblox_snapshots_for_places
from app.subscriptions import is_premium, subscription_to_dto

router = APIRouter()


@router.get("/stats")
async def get_stats(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    now = utc_now_naive()
    tracked_games = list(db.scalars(select(Game).order_by(Game.updatedAt.desc(), Game.name.asc())).all())
    game_ids = [game.id for game in tracked_games]
    game_by_id = {game.id: game for game in tracked_games}
    favorites = int(db.scalar(select(func.count(Favorite.id)).where(Favorite.userId == user.id)) or 0)
    collections = int(db.scalar(select(func.count(Collection.id)).where(Collection.userId == user.id)) or 0)
    launches = int(db.scalar(select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id)) or 0)
    alerts = int(db.scalar(select(func.count(GameAlert.id)).where(GameAlert.userId == user.id)) or 0)
    usage = {
        "games": len(tracked_games),
        "collections": collections,
        "historyEntries": launches,
        "alerts": alerts,
    }

    launch_rows = (
        db.execute(
            select(
                LaunchHistory.gameId,
                func.count(LaunchHistory.id).label("launches"),
                func.max(LaunchHistory.createdAt).label("lastLaunchedAt"),
            )
            .where(LaunchHistory.userId == user.id)
            .group_by(LaunchHistory.gameId)
        ).all()
        if game_ids
        else []
    )
    launch_counts = {game_id: int(count) for game_id, count, _ in launch_rows}
    last_launches = {game_id: last_launched_at for game_id, _, last_launched_at in launch_rows}
    recent_groups = sorted(launch_rows, key=lambda row: row[2], reverse=True)[:5]
    top_groups = sorted(launch_rows, key=lambda row: (int(row[1]), row[2]), reverse=True)[:5]
    favorite_ids = (
        set(
            db.scalars(
                select(Favorite.gameId).where(Favorite.userId == user.id, Favorite.gameId.in_(game_ids))
            ).all()
        )
        if game_ids
        else set()
    )

    roblox_snapshots = await get_roblox_snapshots_for_places([game.placeId for game in tracked_games])
    snapshot_by_game_id = {game.id: roblox_snapshots.get(game.placeId) for game in tracked_games}
    live_snapshots = [snapshot for snapshot in snapshot_by_game_id.values() if snapshot is not None]
    trends = record_game_metrics(db, tracked_games, snapshot_by_game_id)
    evaluate_game_alerts(db, user, tracked_games, snapshot_by_game_id)

    def game_snapshot(game: Game) -> RobloxGameSnapshot | None:
        return snapshot_by_game_id.get(game.id)

    def full_game(game: Game) -> dict[str, Any]:
        return game_to_dto(
            game,
            is_favorite=game.id in favorite_ids,
            launch_count=launch_counts.get(game.id, 0),
            last_launched_at=last_launches.get(game.id),
            roblox=game_snapshot(game),
        )

    def sum_snapshot_number(field: str) -> int:
        return sum(
            value
            for snapshot in live_snapshots
            if isinstance((value := getattr(snapshot, field)), int)
        )

    trending_games = sorted(
        (game for game in tracked_games if game_snapshot(game) is not None),
        key=lambda game: (
            game_snapshot(game).playing or 0,  # type: ignore[union-attr]
            game_snapshot(game).visits or 0,  # type: ignore[union-attr]
        ),
        reverse=True,
    )
    updated_games = [
        game
        for game in tracked_games
        if last_launches.get(game.id)
        and (updated_at := parse_roblox_datetime(game_snapshot(game).updatedAt if game_snapshot(game) else None))
        and updated_at > last_launches[game.id]
    ]
    updated_games.sort(
        key=lambda game: parse_roblox_datetime(game_snapshot(game).updatedAt if game_snapshot(game) else None)
        or now - timedelta(days=3650),
        reverse=True,
    )
    gaining_games = [
        game
        for game in tracked_games
        if isinstance(trends.get(game.id, {}).get("playingDelta"), int)
        and trends[game.id]["playingDelta"] > 0
    ]
    gaining_games.sort(key=lambda game: trends[game.id]["playingDelta"], reverse=True)
    rediscover_games = [
        game
        for game in tracked_games
        if last_launches.get(game.id) and last_launches[game.id] < now - timedelta(days=21)
    ]
    rediscover_games.sort(key=lambda game: last_launches[game.id])

    premium = is_premium(user)

    def smart_deck(
        deck_id: str,
        title: str,
        description: str,
        games: list[Game],
        *,
        premium_only: bool = False,
    ) -> dict[str, Any]:
        locked = premium_only and not premium
        return {
            "id": deck_id,
            "title": title,
            "description": description,
            "gameCount": len(games),
            "premiumOnly": premium_only,
            "locked": locked,
            "games": [] if locked else [full_game(game) for game in games[:20]],
        }

    week_start = now - timedelta(days=7)
    previous_week_start = now - timedelta(days=14)
    weekly_launches = int(
        db.scalar(
            select(func.count(LaunchHistory.id)).where(
                LaunchHistory.userId == user.id,
                LaunchHistory.createdAt >= week_start,
            )
        )
        or 0
    )
    previous_week_launches = int(
        db.scalar(
            select(func.count(LaunchHistory.id)).where(
                LaunchHistory.userId == user.id,
                LaunchHistory.createdAt >= previous_week_start,
                LaunchHistory.createdAt < week_start,
            )
        )
        or 0
    )
    weekly_unique_games = int(
        db.scalar(
            select(func.count(distinct(LaunchHistory.gameId))).where(
                LaunchHistory.userId == user.id,
                LaunchHistory.createdAt >= week_start,
            )
        )
        or 0
    )
    weekly_active_days = int(
        db.scalar(
            select(func.count(distinct(func.date(LaunchHistory.createdAt)))).where(
                LaunchHistory.userId == user.id,
                LaunchHistory.createdAt >= week_start,
            )
        )
        or 0
    )
    weekly_top = db.execute(
        select(LaunchHistory.gameId, func.count(LaunchHistory.id).label("launches"))
        .where(LaunchHistory.userId == user.id, LaunchHistory.createdAt >= week_start)
        .group_by(LaunchHistory.gameId)
        .order_by(func.count(LaunchHistory.id).desc())
        .limit(1)
    ).first()
    weekly_top_game = game_by_id.get(weekly_top[0]) if weekly_top else None
    synced_at = max((snapshot.syncedAt for snapshot in live_snapshots), default=None)

    return {
        "data": {
            "totals": {
                "games": len(tracked_games),
                "favorites": favorites,
                "collections": collections,
                "launches": launches,
            },
            "subscription": subscription_to_dto(user, usage),
            "roblox": {
                "onlinePlayers": sum_snapshot_number("playing"),
                "totalVisits": sum_snapshot_number("visits"),
                "totalFavorites": sum_snapshot_number("favoritedCount"),
                "trackedGames": len(tracked_games),
                "snapshots": len(live_snapshots),
                "unavailable": max(len(tracked_games) - len(live_snapshots), 0),
                "syncedAt": synced_at,
                "trendingGames": [full_game(game) for game in trending_games[:5]],
            },
            "radar": {
                "updatedSinceLastPlay": [full_game(game) for game in updated_games[:6]],
                "gainingNow": [
                    {
                        "game": full_game(game),
                        "playingDelta": trends[game.id]["playingDelta"],
                        "comparedAt": trends[game.id]["comparedAt"],
                    }
                    for game in gaining_games[:6]
                ],
                "capturedAt": synced_at,
            },
            "weekly": {
                "launches": weekly_launches,
                "previousLaunches": previous_week_launches,
                "launchDelta": weekly_launches - previous_week_launches,
                "uniqueGames": weekly_unique_games,
                "activeDays": weekly_active_days,
                "topGame": full_game(weekly_top_game) if weekly_top_game else None,
                "topGameLaunches": int(weekly_top[1]) if weekly_top else 0,
            },
            "smartDecks": [
                smart_deck(
                    "continue",
                    "Continuar jogando",
                    "Seus jogos mais recentes prontos para abrir novamente",
                    [game_by_id[row[0]] for row in recent_groups if row[0] in game_by_id],
                ),
                smart_deck(
                    "playing-now",
                    "Em alta no seu Deck",
                    "Seus jogos salvos com mais jogadores neste momento",
                    trending_games,
                ),
                smart_deck(
                    "updated",
                    "Atualizados desde sua partida",
                    "Experiencias que receberam atualizacoes depois da ultima vez que voce jogou",
                    updated_games,
                    premium_only=True,
                ),
                smart_deck(
                    "rediscover",
                    "Vale redescobrir",
                    "Jogos que voce curtiu e nao abre ha algum tempo",
                    rediscover_games,
                    premium_only=True,
                ),
            ],
            "recent": [
                {
                    "id": f"recent-{game_id}",
                    "createdAt": iso(last_launched_at),
                    "game": plain_game_to_dto(game_by_id[game_id], roblox=game_snapshot(game_by_id[game_id])),
                }
                for game_id, _, last_launched_at in recent_groups
                if game_id in game_by_id
            ],
            "topGames": [
                {
                    "game": plain_game_to_dto(game_by_id[game_id], roblox=game_snapshot(game_by_id[game_id])),
                    "launches": int(count),
                }
                for game_id, count, _ in top_groups
                if game_id in game_by_id
            ],
        }
    }
