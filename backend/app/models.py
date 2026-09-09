from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

CollectionKindEnum = postgresql.ENUM(
    "PLAY_LATER",
    "WITH_FRIENDS",
    "GRIND",
    "COMPETITIVE",
    "CUSTOM",
    name="CollectionKind",
    create_type=False,
)
ThemePreferenceEnum = postgresql.ENUM("DARK", "SYSTEM", name="ThemePreference", create_type=False)


def uuid_text() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    handle: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    displayName: Mapped[str] = mapped_column(String, nullable=False)
    avatarUrl: Mapped[str | None] = mapped_column(String)
    robloxUserId: Mapped[str | None] = mapped_column(String, unique=True)
    robloxUsername: Mapped[str | None] = mapped_column(String)
    subscriptionPlan: Mapped[str] = mapped_column(String, default="FREE", server_default="FREE", nullable=False)
    subscriptionStatus: Mapped[str] = mapped_column(String, default="INACTIVE", server_default="INACTIVE", nullable=False)
    premiumUntil: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    subscriptionProvider: Mapped[str | None] = mapped_column(String)
    subscriptionCustomerId: Mapped[str | None] = mapped_column(String)
    subscriptionExternalId: Mapped[str | None] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    favorites: Mapped[list[Favorite]] = relationship(back_populates="user", cascade="all, delete-orphan")
    collections: Mapped[list[Collection]] = relationship(back_populates="user", cascade="all, delete-orphan")
    launchHistory: Mapped[list[LaunchHistory]] = relationship(back_populates="user", cascade="all, delete-orphan")
    settings: Mapped[AppSettings | None] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    robloxToken: Mapped[RobloxOAuthToken | None] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    gameAlerts: Mapped[list[GameAlert]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Game(Base):
    __tablename__ = "Game"
    __table_args__ = (Index("Game_name_idx", "name"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    placeId: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    imageUrl: Mapped[str | None] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    favorites: Mapped[list[Favorite]] = relationship(back_populates="game", cascade="all, delete-orphan")
    collectionGames: Mapped[list[CollectionGame]] = relationship(back_populates="game", cascade="all, delete-orphan")
    launchHistory: Mapped[list[LaunchHistory]] = relationship(back_populates="game", cascade="all, delete-orphan")
    metricSnapshots: Mapped[list[GameMetricSnapshot]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
    )
    alerts: Mapped[list[GameAlert]] = relationship(back_populates="game", cascade="all, delete-orphan")
    notifications: Mapped[list[Notification]] = relationship(back_populates="game")


class GameMetricSnapshot(Base):
    __tablename__ = "GameMetricSnapshot"
    __table_args__ = (Index("GameMetricSnapshot_gameId_capturedAt_idx", "gameId", "capturedAt"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    gameId: Mapped[str] = mapped_column(String, ForeignKey("Game.id", ondelete="CASCADE"), nullable=False)
    playing: Mapped[int | None] = mapped_column(Integer)
    visits: Mapped[int | None] = mapped_column(BigInteger)
    favoritedCount: Mapped[int | None] = mapped_column(BigInteger)
    robloxUpdatedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    capturedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    game: Mapped[Game] = relationship(back_populates="metricSnapshots")


class GameAlert(Base):
    __tablename__ = "GameAlert"
    __table_args__ = (
        UniqueConstraint("userId", "gameId", "kind", name="GameAlert_userId_gameId_kind_key"),
        Index("GameAlert_userId_enabled_idx", "userId", "enabled"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    gameId: Mapped[str] = mapped_column(String, ForeignKey("Game.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    threshold: Mapped[int | None] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    lastObservedValue: Mapped[int | None] = mapped_column(Integer)
    lastObservedUpdatedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    lastTriggeredAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="gameAlerts")
    game: Mapped[Game] = relationship(back_populates="alerts")


class Notification(Base):
    __tablename__ = "Notification"
    __table_args__ = (Index("Notification_userId_createdAt_idx", "userId", "createdAt"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    gameId: Mapped[str | None] = mapped_column(String, ForeignKey("Game.id", ondelete="SET NULL"))
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    readAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="notifications")
    game: Mapped[Game | None] = relationship(back_populates="notifications")


class Favorite(Base):
    __tablename__ = "Favorite"
    __table_args__ = (
        UniqueConstraint("userId", "gameId", name="Favorite_userId_gameId_key"),
        Index("Favorite_gameId_idx", "gameId"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    gameId: Mapped[str] = mapped_column(String, ForeignKey("Game.id", ondelete="CASCADE"), nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="favorites")
    game: Mapped[Game] = relationship(back_populates="favorites")


class Collection(Base):
    __tablename__ = "Collection"
    __table_args__ = (UniqueConstraint("userId", "name", name="Collection_userId_name_key"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(CollectionKindEnum, default="CUSTOM", nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    color: Mapped[str] = mapped_column(String, default="#38bdf8", nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="collections")
    games: Mapped[list[CollectionGame]] = relationship(back_populates="collection", cascade="all, delete-orphan")


class CollectionGame(Base):
    __tablename__ = "CollectionGame"
    __table_args__ = (
        UniqueConstraint("collectionId", "gameId", name="CollectionGame_collectionId_gameId_key"),
        Index("CollectionGame_gameId_idx", "gameId"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    collectionId: Mapped[str] = mapped_column(
        String,
        ForeignKey("Collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    gameId: Mapped[str] = mapped_column(String, ForeignKey("Game.id", ondelete="CASCADE"), nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    collection: Mapped[Collection] = relationship(back_populates="games")
    game: Mapped[Game] = relationship(back_populates="collectionGames")


class LaunchHistory(Base):
    __tablename__ = "LaunchHistory"
    __table_args__ = (
        Index("LaunchHistory_userId_createdAt_idx", "userId", "createdAt"),
        Index("LaunchHistory_gameId_idx", "gameId"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    gameId: Mapped[str] = mapped_column(String, ForeignKey("Game.id", ondelete="CASCADE"), nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="launchHistory")
    game: Mapped[Game] = relationship(back_populates="launchHistory")


class AppSettings(Base):
    __tablename__ = "AppSettings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(ThemePreferenceEnum, default="DARK", nullable=False)
    accentColor: Mapped[str] = mapped_column(String, default="#38bdf8", nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="settings")


class RobloxOAuthToken(Base):
    __tablename__ = "RobloxOAuthToken"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_text)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False)
    accessToken: Mapped[str] = mapped_column(String, nullable=False)
    refreshToken: Mapped[str | None] = mapped_column(String)
    tokenType: Mapped[str | None] = mapped_column(String)
    scopes: Mapped[str | None] = mapped_column(String)
    expiresAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="robloxToken")
