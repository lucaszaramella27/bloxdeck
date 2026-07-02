from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import Settings
from app.errors import bad_request

AUTHORIZATION_URL = "https://apis.roblox.com/oauth/v1/authorize"
TOKEN_URL = "https://apis.roblox.com/oauth/v1/token"
USERINFO_URL = "https://apis.roblox.com/oauth/v1/userinfo"
REQUEST_TIMEOUT = 10.0
STATE_TTL = timedelta(minutes=10)


@dataclass
class OAuthState:
    code_verifier: str
    redirect_uri: str
    expires_at: datetime


@dataclass
class RobloxProfile:
    user_id: str
    username: str | None
    display_name: str | None
    avatar_url: str | None


oauth_states: dict[str, OAuthState] = {}


def base64_urlsafe(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def create_code_verifier() -> str:
    return base64_urlsafe(secrets.token_bytes(32))


def create_code_challenge(code_verifier: str) -> str:
    return base64_urlsafe(hashlib.sha256(code_verifier.encode("ascii")).digest())


def cleanup_expired_states() -> None:
    now = datetime.now(timezone.utc)
    expired = [state for state, data in oauth_states.items() if data.expires_at <= now]

    for state in expired:
        oauth_states.pop(state, None)


def create_authorization_url(settings: Settings, redirect_uri: str) -> str:
    cleanup_expired_states()
    state = secrets.token_urlsafe(24)
    code_verifier = create_code_verifier()
    code_challenge = create_code_challenge(code_verifier)
    oauth_states[state] = OAuthState(
        code_verifier=code_verifier,
        redirect_uri=redirect_uri,
        expires_at=datetime.now(timezone.utc) + STATE_TTL,
    )
    params = {
        "client_id": settings.roblox_client_id,
        "redirect_uri": redirect_uri,
        "scope": settings.roblox_scopes,
        "response_type": "code",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    return f"{AUTHORIZATION_URL}?{urlencode(params)}"


def get_state(state: str | None) -> OAuthState:
    cleanup_expired_states()

    if not state:
        raise bad_request("Sessao de login sem state. Tente entrar novamente.")

    data = oauth_states.pop(state, None)

    if data is None:
        raise bad_request("Sessao de login expirada. Tente entrar novamente.")

    return data


async def exchange_code_for_access_token(settings: Settings, code: str, state: str | None) -> str:
    oauth_state = get_state(state)
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.roblox_client_id,
        "code_verifier": oauth_state.code_verifier,
    }

    if settings.roblox_client_secret:
        payload["client_secret"] = settings.roblox_client_secret

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.post(
            TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if response.status_code >= 400:
        raise bad_request("Nao consegui trocar o codigo do Roblox por token. Confira Client ID, Secret e Redirect URI.")

    data = response.json()
    access_token = data.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        raise bad_request("Roblox nao retornou access_token.")

    return access_token


async def fetch_roblox_profile(access_token: str) -> RobloxProfile:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})

    if response.status_code >= 400:
        raise bad_request("Nao consegui buscar o perfil Roblox com esse token.")

    data: dict[str, Any] = response.json()
    user_id = data.get("sub")

    if not isinstance(user_id, str) or not user_id:
        raise bad_request("Roblox nao retornou o ID do usuario.")

    username = data.get("preferred_username") or data.get("nickname")
    display_name = data.get("name") or username
    avatar_url = data.get("picture")

    return RobloxProfile(
        user_id=user_id,
        username=username if isinstance(username, str) else None,
        display_name=display_name if isinstance(display_name, str) else None,
        avatar_url=avatar_url if isinstance(avatar_url, str) else None,
    )


async def get_roblox_profile_from_code(settings: Settings, code: str, state: str | None) -> RobloxProfile:
    access_token = await exchange_code_for_access_token(settings, code, state)
    return await fetch_roblox_profile(access_token)
