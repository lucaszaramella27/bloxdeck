from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.errors import ApiError, api_error_handler, http_error_handler, validation_error_handler
from app.routers import alerts, auth, collections, creator, favorites, games, health, history, profile, roblox_search, social, stats


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="BloxDeck API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_origin_regex=r"^(tauri://.*|https?://tauri\.localhost(?::\d+)?)$",
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)

    app.include_router(health.router)
    app.include_router(games.router)
    app.include_router(favorites.router)
    app.include_router(collections.router)
    app.include_router(history.router)
    app.include_router(stats.router)
    app.include_router(alerts.router)
    app.include_router(creator.router)
    app.include_router(profile.router)
    app.include_router(auth.router)
    app.include_router(roblox_search.router)
    app.include_router(social.router)

    return app


app = create_app()
