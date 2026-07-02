from __future__ import annotations

from datetime import datetime
from typing import Any

from app.models import AppSettings, Collection, Game
from app.roblox import RobloxGameSnapshot


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def settings_to_dto(settings: AppSettings | None) -> dict[str, Any] | None:
    if settings is None:
        return None

    return {
        "id": settings.id,
        "userId": settings.userId,
        "theme": settings.theme,
        "accentColor": settings.accentColor,
        "createdAt": iso(settings.createdAt),
        "updatedAt": iso(settings.updatedAt),
    }


def game_to_dto(
    game: Game,
    *,
    is_favorite: bool = False,
    launch_count: int = 0,
    last_launched_at: datetime | None = None,
    roblox: RobloxGameSnapshot | None = None,
) -> dict[str, Any]:
    return {
        "id": game.id,
        "placeId": game.placeId,
        "name": roblox.name if roblox else game.name,
        "description": roblox.description if roblox else game.description,
        "imageUrl": roblox.imageUrl if roblox else game.imageUrl,
        "isFavorite": is_favorite,
        "launchCount": launch_count,
        "lastLaunchedAt": iso(last_launched_at),
        "roblox": roblox.to_dict() if roblox else None,
        "createdAt": iso(game.createdAt),
        "updatedAt": iso(game.updatedAt),
    }


def plain_game_to_dto(game: Game, *, roblox: RobloxGameSnapshot | None = None) -> dict[str, Any]:
    return {
        "id": game.id,
        "placeId": game.placeId,
        "name": roblox.name if roblox else game.name,
        "description": roblox.description if roblox else game.description,
        "imageUrl": roblox.imageUrl if roblox else game.imageUrl,
        "roblox": roblox.to_dict() if roblox else None,
        "createdAt": iso(game.createdAt),
        "updatedAt": iso(game.updatedAt),
    }


def collection_to_dto(collection: Collection, game_count: int = 0) -> dict[str, Any]:
    return {
        "id": collection.id,
        "name": collection.name,
        "type": collection.type,
        "description": collection.description,
        "color": collection.color,
        "gameCount": game_count,
        "createdAt": iso(collection.createdAt),
        "updatedAt": iso(collection.updatedAt),
    }
