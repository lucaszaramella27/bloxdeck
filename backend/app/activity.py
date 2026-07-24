from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Game, GameMetricSnapshot
from app.roblox import RobloxGameSnapshot

CAPTURE_INTERVAL = timedelta(minutes=10)
SNAPSHOT_RETENTION = timedelta(days=45)


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_roblox_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def metric_delta(current: int | None, previous: int | None) -> int | None:
    if current is None or previous is None:
        return None

    return current - previous


def record_game_metrics(
    db: Session,
    games: list[Game],
    snapshots_by_game_id: dict[str, RobloxGameSnapshot | None],
) -> dict[str, dict[str, Any]]:
    now = utc_now_naive()
    trends: dict[str, dict[str, Any]] = {}
    changed = False

    for game in games:
        current = snapshots_by_game_id.get(game.id)

        if current is None:
            continue

        previous = db.scalar(
            select(GameMetricSnapshot)
            .where(GameMetricSnapshot.gameId == game.id)
            .order_by(GameMetricSnapshot.capturedAt.desc())
            .limit(1)
        )
        trends[game.id] = {
            "playingDelta": metric_delta(current.playing, previous.playing if previous else None),
            "visitsDelta": metric_delta(current.visits, previous.visits if previous else None),
            "favoritesDelta": metric_delta(
                current.favoritedCount,
                previous.favoritedCount if previous else None,
            ),
            "comparedAt": previous.capturedAt.isoformat() if previous else None,
        }

        if previous is not None and now - previous.capturedAt < CAPTURE_INTERVAL:
            continue

        db.add(
            GameMetricSnapshot(
                gameId=game.id,
                playing=current.playing,
                visits=current.visits,
                favoritedCount=current.favoritedCount,
                robloxUpdatedAt=parse_roblox_datetime(current.updatedAt),
                capturedAt=now,
            )
        )
        changed = True

    if changed:
        db.execute(delete(GameMetricSnapshot).where(GameMetricSnapshot.capturedAt < now - SNAPSHOT_RETENTION))
        db.commit()

    return trends
