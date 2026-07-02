from __future__ import annotations

from fastapi import APIRouter

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.errors import bad_request
from app.roblox_social import get_social_overview

router = APIRouter(prefix="/roblox", tags=["roblox-social"])


@router.get("/social")
async def social_overview(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)

    if not user.robloxUserId:
        raise bad_request("Conecte sua conta Roblox para carregar social e avatar.")

    return {"data": await get_social_overview(user.robloxUserId)}
