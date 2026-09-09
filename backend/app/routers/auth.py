from __future__ import annotations

from html import escape

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, HttpUrl

from app.bootstrap import ensure_local_user
from app.config import get_settings
from app.dependencies import DbSession
from app.dto import iso, settings_to_dto
from app.errors import ApiError, bad_request
from app.models import RobloxOAuthToken
from app.roblox_oauth import RobloxTokenSet, create_authorization_url, get_roblox_session_from_code
from app.subscriptions import subscription_to_dto, subscription_usage

router = APIRouter(prefix="/auth")


class RobloxAuthCallbackInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    state: str | None = None
    handle: str | None = None
    displayName: str | None = None
    avatarUrl: HttpUrl | None = None


def serialize_profile(user, db: DbSession) -> dict[str, object]:
    return {
        "id": user.id,
        "handle": user.handle,
        "displayName": user.displayName,
        "avatarUrl": user.avatarUrl,
        "robloxUserId": user.robloxUserId,
        "robloxUsername": user.robloxUsername,
        "settings": settings_to_dto(user.settings),
        "subscription": subscription_to_dto(user, subscription_usage(db, user)),
        "createdAt": iso(user.createdAt),
        "updatedAt": iso(user.updatedAt),
    }


def save_roblox_tokens(user, tokens: RobloxTokenSet, db: DbSession) -> None:
    roblox_token = user.robloxToken

    if roblox_token is None:
        roblox_token = RobloxOAuthToken(userId=user.id, accessToken=tokens.access_token)
        user.robloxToken = roblox_token
        db.add(roblox_token)

    roblox_token.accessToken = tokens.access_token
    roblox_token.refreshToken = tokens.refresh_token or roblox_token.refreshToken
    roblox_token.tokenType = tokens.token_type or roblox_token.tokenType
    roblox_token.scopes = tokens.scopes or roblox_token.scopes
    roblox_token.expiresAt = tokens.expires_at


async def connect_roblox_account(code: str, state: str | None, db: DbSession) -> dict[str, object]:
    user = ensure_local_user(db)
    settings = get_settings()

    if not settings.roblox_client_id:
        raise bad_request("Login real do Roblox não está configurado. Configure ROBLOX_CLIENT_ID no .env.")

    roblox_session = await get_roblox_session_from_code(settings, code, state)
    profile = roblox_session.profile
    user.robloxUserId = profile.user_id
    user.robloxUsername = profile.username

    if profile.display_name:
        user.displayName = profile.display_name

    if profile.avatar_url:
        user.avatarUrl = profile.avatar_url

    save_roblox_tokens(user, roblox_session.tokens, db)

    db.commit()
    db.refresh(user)
    return serialize_profile(user, db)


def browser_callback_page(success: bool, message: str) -> str:
    title = "Conta conectada" if success else "Não foi possível conectar"
    detail = escape(message)
    tone = "#34d399" if success else "#fb7185"
    icon = "✓" if success else "!"

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BloxDeck | {title}</title>
  <style>
    * {{ box-sizing: border-box }}
    body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0d0d10; color: #f4f5f7; font: 16px Inter, system-ui, sans-serif }}
    main {{ width: min(460px, 100%); border-radius: 8px; background: #191a1f; padding: 32px }}
    .brand {{ color: #a78bfa; font-size: 13px; font-weight: 800; text-transform: uppercase }}
    .status {{ width: 48px; height: 48px; margin-top: 28px; display: grid; place-items: center; border-radius: 8px; background: {tone}22; color: {tone}; font-size: 24px; font-weight: 900 }}
    h1 {{ margin: 20px 0 0; font-size: 28px; line-height: 1.15 }}
    p {{ margin: 12px 0 0; color: #a8adb7; line-height: 1.65 }}
    button {{ width: 100%; height: 44px; margin-top: 28px; border: 0; border-radius: 8px; background: #8b5cf6; color: white; font: inherit; font-weight: 700; cursor: pointer }}
  </style>
</head>
<body>
  <main>
    <div class="brand">BloxDeck</div>
    <div class="status">{icon}</div>
    <h1>{title}</h1>
    <p>{detail}</p>
    <button type="button" onclick="window.close()">Fechar esta aba</button>
  </main>
</body>
</html>"""


@router.get("/roblox/start")
def start_roblox_auth() -> dict[str, dict[str, str]]:
    settings = get_settings()
    callback_uri = settings.roblox_redirect_uri

    if not settings.roblox_client_id:
        raise bad_request("Login real do Roblox não está configurado. Configure ROBLOX_CLIENT_ID no .env.")

    auth_url = create_authorization_url(settings, callback_uri)
    mode = "oauth"

    return {"data": {"authUrl": auth_url, "mode": mode}}


@router.delete("/roblox/session")
def disconnect_roblox_auth(db: DbSession) -> dict[str, dict[str, object]]:
    user = ensure_local_user(db)

    user.robloxUserId = None
    user.robloxUsername = None
    user.displayName = "Jogador Roblox"
    user.avatarUrl = None

    if user.robloxToken is not None:
        db.delete(user.robloxToken)
        user.robloxToken = None

    db.commit()
    db.refresh(user)

    return {"data": serialize_profile(user, db)}


@router.get("/roblox/callback", response_class=HTMLResponse)
async def complete_roblox_auth_in_browser(
    db: DbSession,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
) -> HTMLResponse:
    if error:
        message = error_description or "A autorização foi cancelada no Roblox"
        return HTMLResponse(browser_callback_page(False, message), status_code=400)

    if not code:
        return HTMLResponse(
            browser_callback_page(False, "O Roblox não retornou o código de autorização"),
            status_code=400,
        )

    try:
        await connect_roblox_account(code, state, db)
    except ApiError as auth_error:
        return HTMLResponse(
            browser_callback_page(False, auth_error.message),
            status_code=auth_error.status_code,
        )

    return HTMLResponse(
        browser_callback_page(True, "Volte ao launcher, o acesso será liberado automaticamente"),
    )


@router.post("/roblox/callback")
async def complete_roblox_auth(body: RobloxAuthCallbackInput, db: DbSession) -> dict[str, dict[str, object]]:
    return {"data": await connect_roblox_account(body.code, body.state, db)}
