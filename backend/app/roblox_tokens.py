from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import bad_request
from app.models import User
from app.roblox_oauth import refresh_access_token

REFRESH_MARGIN = timedelta(minutes=2)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def get_valid_roblox_access_token(db: Session, user: User) -> str:
    token = user.robloxToken

    if token is None or not token.accessToken:
        raise bad_request("Entre com Roblox de novo para liberar inventario e dados do avatar.")

    should_refresh = token.refreshToken and (
        token.expiresAt is None or token.expiresAt <= utc_now() + REFRESH_MARGIN
    )

    if should_refresh:
        refreshed = await refresh_access_token(get_settings(), token.refreshToken)
        token.accessToken = refreshed.access_token
        token.refreshToken = refreshed.refresh_token or token.refreshToken
        token.tokenType = refreshed.token_type or token.tokenType
        token.scopes = refreshed.scopes or token.scopes
        token.expiresAt = refreshed.expires_at
        db.add(token)
        db.commit()

    if token.expiresAt is not None and token.expiresAt <= utc_now():
        raise bad_request("Sessão Roblox expirou. Entre com Roblox de novo para liberar as ações do launcher.")

    return token.accessToken
