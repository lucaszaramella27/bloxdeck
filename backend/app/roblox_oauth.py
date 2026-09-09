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


@dataclass
class RobloxTokenSet:
    access_token: str
    refresh_token: str | None
    token_type: str | None
    scopes: str | None
    expires_at: datetime | None


@dataclass
class RobloxOAuthSession:
    profile: RobloxProfile
    tokens: RobloxTokenSet


oauth_states: dict[str, OAuthState] = {}


def base64_urlsafe(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def create_code_verifier() -> str:
    return base64_urlsafe(secrets.token_bytes(32))


def create_code_challenge(code_verifier: str) -> str:
    return base64_urlsafe(hashlib.sha256(code_verifier.encode("ascii")).digest())


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
        "prompt": "select_account consent",
    }

    return f"{AUTHORIZATION_URL}?{urlencode(params)}"


def get_state(state: str | None) -> OAuthState:
    cleanup_expired_states()

    if not state:
        raise bad_request("Sessão de login sem state. Tente entrar novamente.")

    data = oauth_states.pop(state, None)

    if data is None:
        raise bad_request("Sessão de login expirada. Tente entrar novamente.")

    return data


def parse_token_set(data: dict[str, Any]) -> RobloxTokenSet:
    access_token = data.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        raise bad_request("Roblox não retornou access_token.")

    refresh_token = data.get("refresh_token")
    token_type = data.get("token_type")
    scopes = data.get("scope")
    expires_at: datetime | None = None

    try:
        expires_in = int(data.get("expires_in"))
    except (TypeError, ValueError):
        expires_in = 0

    if expires_in > 0:
        expires_at = utc_now() + timedelta(seconds=max(0, expires_in - 30))

    return RobloxTokenSet(
        access_token=access_token,
        refresh_token=refresh_token if isinstance(refresh_token, str) and refresh_token else None,
        token_type=token_type if isinstance(token_type, str) and token_type else None,
        scopes=scopes if isinstance(scopes, str) and scopes else None,
        expires_at=expires_at,
    )


async def exchange_code_for_tokens(settings: Settings, code: str, state: str | None) -> RobloxTokenSet:
    oauth_state = get_state(state)
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.roblox_client_id,
        "code_verifier": oauth_state.code_verifier,
    }

    if settings.roblox_client_secret:
        payload["client_secret"] = settings.roblox_client_secret

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.TimeoutException:
        raise bad_request("Roblox demorou para responder. Tente entrar novamente.")
    except httpx.HTTPError:
        raise bad_request("Não foi possível conectar ao Roblox para concluir o login.")

    if response.status_code >= 400:
        raise bad_request("Não consegui trocar o código do Roblox por token. Confira Client ID, Secret e Redirect URI.")

    return parse_token_set(response.json())


async def exchange_code_for_access_token(settings: Settings, code: str, state: str | None) -> str:
    tokens = await exchange_code_for_tokens(settings, code, state)
    return tokens.access_token


async def refresh_access_token(settings: Settings, refresh_token: str) -> RobloxTokenSet:
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.roblox_client_id,
    }

    if settings.roblox_client_secret:
        payload["client_secret"] = settings.roblox_client_secret

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.TimeoutException:
        raise bad_request("Roblox demorou para renovar sua sessão. Entre com Roblox novamente.")
    except httpx.HTTPError:
        raise bad_request("Não foi possível renovar sua sessão Roblox agora.")

    if response.status_code >= 400:
        raise bad_request("Sessão Roblox expirou. Entre com Roblox de novo para liberar as ações do launcher.")

    return parse_token_set(response.json())


async def fetch_roblox_profile(access_token: str) -> RobloxProfile:
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    except httpx.TimeoutException:
        raise bad_request("Roblox demorou para carregar seu perfil. Tente entrar novamente.")
    except httpx.HTTPError:
        raise bad_request("Não foi possível carregar seu perfil Roblox agora.")

    if response.status_code >= 400:
        raise bad_request("Não consegui buscar o perfil Roblox com esse token.")

    data: dict[str, Any] = response.json()
    user_id = data.get("sub")

    if not isinstance(user_id, str) or not user_id:
        raise bad_request("Roblox não retornou o ID do usuário.")

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
    tokens = await exchange_code_for_tokens(settings, code, state)
    return await fetch_roblox_profile(tokens.access_token)


async def get_roblox_session_from_code(settings: Settings, code: str, state: str | None) -> RobloxOAuthSession:
    tokens = await exchange_code_for_tokens(settings, code, state)
    profile = await fetch_roblox_profile(tokens.access_token)

    return RobloxOAuthSession(profile=profile, tokens=tokens)
