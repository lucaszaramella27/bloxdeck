from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, HttpUrl

from app.bootstrap import ensure_local_user
from app.config import get_settings
from app.dependencies import DbSession
from app.dto import iso, settings_to_dto
from app.errors import bad_request
from app.roblox_oauth import create_authorization_url, get_roblox_profile_from_code

router = APIRouter(prefix="/auth")


class RobloxAuthCallbackInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    state: str | None = None
    handle: str | None = None
    displayName: str | None = None
    avatarUrl: HttpUrl | None = None


def serialize_profile(user) -> dict[str, object]:
    return {
        "id": user.id,
        "handle": user.handle,
        "displayName": user.displayName,
        "avatarUrl": user.avatarUrl,
        "robloxUserId": user.robloxUserId,
        "robloxUsername": user.robloxUsername,
        "settings": settings_to_dto(user.settings),
        "createdAt": iso(user.createdAt),
        "updatedAt": iso(user.updatedAt),
    }


@router.get("/roblox/start")
def start_roblox_auth() -> dict[str, dict[str, str]]:
    settings = get_settings()
    callback_uri = settings.roblox_redirect_uri

    if not settings.roblox_client_id:
        raise bad_request("Login real do Roblox nao esta configurado. Configure ROBLOX_CLIENT_ID no .env.")

    auth_url = create_authorization_url(settings, callback_uri)
    mode = "oauth"

    return {"data": {"authUrl": auth_url, "mode": mode}}


@router.post("/roblox/callback")
async def complete_roblox_auth(body: RobloxAuthCallbackInput, db: DbSession) -> dict[str, dict[str, object]]:
    user = ensure_local_user(db)
    settings = get_settings()

    if body.code == "demo-connect" and body.state == "local-demo":
        return {"data": serialize_profile(user)}

    if not settings.roblox_client_id:
        raise bad_request("Login real do Roblox nao esta configurado. Configure ROBLOX_CLIENT_ID no .env.")

    profile = await get_roblox_profile_from_code(settings, body.code, body.state)
    user.robloxUserId = profile.user_id
    user.robloxUsername = profile.username

    if profile.display_name:
        user.displayName = profile.display_name

    if profile.avatar_url:
        user.avatarUrl = profile.avatar_url

    db.commit()
    db.refresh(user)

    return {"data": serialize_profile(user)}
