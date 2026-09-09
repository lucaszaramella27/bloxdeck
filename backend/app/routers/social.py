from __future__ import annotations

import httpx
from fastapi import APIRouter, Query

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.errors import bad_request, not_found
from app.roblox_avatar import get_inventory_items
from app.roblox_social import get_public_user_profile, get_social_overview, search_roblox_users
from app.roblox_tokens import get_valid_roblox_access_token

router = APIRouter(prefix="/roblox", tags=["roblox-social"])


async def get_roblox_context(db: DbSession):
    user = ensure_local_user(db)

    if not user.robloxUserId:
        raise bad_request("Conecte sua conta Roblox para carregar social e avatar.")

    access_token = await get_valid_roblox_access_token(db, user)

    return user, access_token


@router.get("/social")
async def social_overview(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)

    if not user.robloxUserId:
        raise bad_request("Conecte sua conta Roblox para carregar social e avatar.")

    return {"data": await get_social_overview(user.robloxUserId)}


@router.get("/users/search")
async def search_users(
    q: str = Query(min_length=3, max_length=50),
    cursor: str | None = Query(default=None, max_length=500),
) -> dict[str, dict]:
    try:
        return {"data": await search_roblox_users(q, cursor=cursor)}
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 429:
            raise bad_request("O Roblox limitou a busca por alguns instantes. Tente novamente em um minuto.") from error

        raise bad_request("Não consegui pesquisar jogadores no Roblox agora.") from error
    except httpx.HTTPError as error:
        raise bad_request("Não consegui falar com o Roblox agora.") from error


@router.get("/users/{user_id}/profile")
async def public_user_profile(user_id: int) -> dict[str, dict]:
    try:
        return {"data": await get_public_user_profile(str(user_id))}
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            raise not_found("Usuário Roblox não encontrado.") from error

        raise bad_request("Não consegui carregar esse perfil Roblox agora.") from error
    except httpx.HTTPError as error:
        raise bad_request("Não consegui falar com o Roblox agora.") from error


@router.get("/inventory")
async def inventory(
    db: DbSession,
    cursor: str | None = None,
    limit: int = Query(48, ge=1, le=100),
    filter: str | None = None,
    category: str | None = None,
) -> dict[str, dict]:
    user, access_token = await get_roblox_context(db)

    return {
        "data": await get_inventory_items(
            user.robloxUserId,
            access_token,
            cursor=cursor,
            limit=limit,
            filter_value=filter,
            category=category,
        )
    }
