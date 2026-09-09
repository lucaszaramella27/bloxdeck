from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

CollectionKind = Literal["PLAY_LATER", "WITH_FRIENDS", "GRIND", "COMPETITIVE", "CUSTOM"]
ThemePreference = Literal["DARK", "SYSTEM"]
GameAlertKind = Literal["GAME_UPDATE", "PLAYER_THRESHOLD"]


def empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()
    return value or None


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateGameInput(ApiModel):
    placeId: str
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, min_length=3, max_length=4000)

    @field_validator("placeId")
    @classmethod
    def validate_place_id(cls, value: str) -> str:
        value = value.strip()

        if not re.fullmatch(r"\d+", value):
            raise ValueError("placeId must contain only digits")

        return value

    @field_validator("name", "description", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return empty_to_none(value)


class UpdateGameInput(ApiModel):
    placeId: str | None = None
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, min_length=3, max_length=4000)

    @field_validator("placeId")
    @classmethod
    def validate_place_id(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not re.fullmatch(r"\d+", value):
            raise ValueError("placeId must contain only digits")

        return value

    @field_validator("name", "description", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return empty_to_none(value)


class CreateCollectionInput(ApiModel):
    name: str = Field(min_length=2, max_length=80)
    type: CollectionKind = "CUSTOM"
    description: str | None = Field(default=None, max_length=500)
    color: str = "#38bdf8"

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return empty_to_none(value)

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("color must be a hex color")

        return value


class UpdateProfileInput(ApiModel):
    displayName: str | None = Field(default=None, min_length=2, max_length=80)
    avatarUrl: HttpUrl | None = None
    theme: ThemePreference | None = None
    accentColor: str | None = None

    @field_validator("displayName", mode="before")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        return empty_to_none(value)

    @field_validator("accentColor")
    @classmethod
    def validate_accent_color(cls, value: str | None) -> str | None:
        if value is None:
            return None

        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("accentColor must be a hex color")

        return value


class CreateGameAlertInput(ApiModel):
    gameId: str = Field(min_length=1)
    kind: GameAlertKind
    threshold: int | None = Field(default=None, ge=1, le=10_000_000)

    @model_validator(mode="after")
    def validate_threshold(self) -> "CreateGameAlertInput":
        if self.kind == "PLAYER_THRESHOLD" and self.threshold is None:
            raise ValueError("threshold is required for player alerts")

        if self.kind == "GAME_UPDATE":
            self.threshold = None

        return self


class UpdateGameAlertInput(ApiModel):
    enabled: bool
