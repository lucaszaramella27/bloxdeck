from __future__ import annotations

import httpx
from fastapi import APIRouter, Query

from app.bootstrap import ensure_local_user
from app.config import get_settings
from app.dependencies import DbSession
from app.errors import bad_request, not_found
from app.roblox import RobloxRateLimitError
from app.roblox_creator import get_creator_analytics, get_creator_experiences

router = APIRouter(prefix="/creator", tags=["creator"])


@router.get("/overview")
async def creator_overview(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)

    if not user.robloxUserId:
        raise bad_request("Conecte sua conta Roblox para abrir o Modo Criador")

    try:
        experiences = await get_creator_experiences(user.robloxUserId)
    except (httpx.HTTPError, RobloxRateLimitError) as error:
        raise bad_request("Não foi possível carregar suas experiências agora") from error

    def sum_number(field: str) -> int:
        return sum(int(item.get(field) or 0) for item in experiences)

    return {
        "data": {
            "creator": {
                "userId": user.robloxUserId,
                "username": user.robloxUsername,
                "displayName": user.displayName,
            },
            "totals": {
                "experiences": len(experiences),
                "playing": sum_number("playing"),
                "visits": sum_number("visits"),
                "favorites": sum_number("favoritedCount"),
            },
            "openCloud": {
                "analyticsConfigured": bool(get_settings().roblox_open_cloud_api_key),
            },
            "experiences": experiences,
        }
    }


@router.get("/experiences/{universe_id}/analytics")
async def creator_analytics(
    universe_id: str,
    db: DbSession,
    days: int = Query(30, ge=7, le=90),
) -> dict[str, dict]:
    user = ensure_local_user(db)

    if not user.robloxUserId:
        raise bad_request("Conecte sua conta Roblox para abrir o Modo Criador")

    experiences = await get_creator_experiences(user.robloxUserId)

    if not any(experience["universeId"] == universe_id for experience in experiences):
        raise not_found("Experiência não encontrada entre suas criações públicas")

    return {"data": await get_creator_analytics(universe_id, days)}
