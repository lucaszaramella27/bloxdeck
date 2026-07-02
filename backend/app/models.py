from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func
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
