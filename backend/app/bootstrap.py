from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppSettings, User

DEFAULT_THEME = "DARK"
DEFAULT_ACCENT_COLOR = "#38bdf8"


def ensure_user_settings(user: User) -> AppSettings:
    if user.settings is None:
        user.settings = AppSettings(userId=user.id, theme=DEFAULT_THEME, accentColor=DEFAULT_ACCENT_COLOR)

    return user.settings


def ensure_local_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.handle == "local-player"))
    changed = False

    if user is None:
        user = User(handle="local-player", displayName="Jogador Roblox")
        db.add(user)
        db.flush()
        changed = True

    if user.settings is None:
        ensure_user_settings(user)
        changed = True

    if changed:
        db.commit()
        db.refresh(user)

    return user
