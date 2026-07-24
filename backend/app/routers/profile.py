from __future__ import annotations

from fastapi import APIRouter

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import iso, settings_to_dto
from app.models import AppSettings
from app.schemas import UpdateProfileInput
from app.subscriptions import subscription_to_dto, subscription_usage

router = APIRouter()


def profile_to_dto(user, db: DbSession) -> dict:
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


@router.get("/profile")
def get_profile(db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)

    return {"data": profile_to_dto(user, db)}


@router.patch("/profile")
def update_profile(body: UpdateProfileInput, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    data = body.model_dump(exclude_unset=True)

    if "displayName" in data:
        user.displayName = data["displayName"]

    if "avatarUrl" in data:
        user.avatarUrl = str(data["avatarUrl"]) if data["avatarUrl"] else None

    if user.settings is None:
        user.settings = AppSettings(theme="DARK", accentColor="#38bdf8")

    if "theme" in data and data["theme"] is not None:
        user.settings.theme = data["theme"]

    if "accentColor" in data and data["accentColor"] is not None:
        user.settings.accentColor = data["accentColor"]

    db.commit()
    db.refresh(user)

    return {"data": profile_to_dto(user, db)}
