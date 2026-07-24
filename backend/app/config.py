from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import dotenv_values
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]


def normalize_database_url(url: str) -> str:
    parts = urlsplit(url.strip().strip('"').strip("'"))
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "schema"]
    scheme = "postgresql+pg8000" if parts.scheme in {"postgres", "postgresql"} else parts.scheme

    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def load_env_values() -> dict[str, str]:
    values: dict[str, str] = dict(os.environ)

    for path in (ROOT_DIR / ".env", BACKEND_DIR / ".env"):
        if path.exists():
            values.update({key: str(value) for key, value in dotenv_values(path).items() if value is not None})

    return values


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    node_env: str = "development"
    database_url: str = "postgresql://bloxdeck:bloxdeck_dev_password@localhost:5432/bloxdeck?schema=public"
    port: int = 3333
    host: str = "0.0.0.0"
    cors_origin: str = "http://localhost:1420,http://127.0.0.1:1420,http://tauri.localhost,https://tauri.localhost,tauri://localhost"
    roblox_client_id: str | None = None
    roblox_client_secret: str | None = None
    roblox_redirect_uri: str = "http://localhost:3333/auth/roblox/callback"
    roblox_scopes: str = "openid profile user.inventory-item:read"
    roblox_open_cloud_api_key: str | None = None

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origin.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    values = load_env_values()

    return Settings(
        node_env=values.get("NODE_ENV", "development"),
        database_url=values.get("DATABASE_URL", Settings.model_fields["database_url"].default),
        port=int(values.get("PORT", Settings.model_fields["port"].default)),
        host=values.get("HOST", Settings.model_fields["host"].default),
        cors_origin=values.get("CORS_ORIGIN", Settings.model_fields["cors_origin"].default),
        roblox_client_id=values.get("ROBLOX_CLIENT_ID") or None,
        roblox_client_secret=values.get("ROBLOX_CLIENT_SECRET") or None,
        roblox_redirect_uri=values.get("ROBLOX_REDIRECT_URI", Settings.model_fields["roblox_redirect_uri"].default),
        roblox_scopes=values.get("ROBLOX_SCOPES", Settings.model_fields["roblox_scopes"].default),
        roblox_open_cloud_api_key=values.get("ROBLOX_OPEN_CLOUD_API_KEY") or None,
    )
