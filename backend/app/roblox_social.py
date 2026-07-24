from __future__ import annotations

import asyncio
import json
import math
from datetime import datetime, timezone
from typing import Any

import httpx

from app.simple_cache import cache_get, cache_set

REQUEST_TIMEOUT = 8.0


def retry_after_seconds(response: httpx.Response) -> int:
    retry_values: list[int] = []

    for header in ("Retry-After", "x-ratelimit-reset"):
        value = response.headers.get(header)

        if not value:
            continue

        try:
            retry_values.append(math.ceil(float(value)))
        except ValueError:
            continue

    return max(1, min(max(retry_values, default=60), 300))


async def get_json(url: str, ttl: float = 20.0) -> Any:
    cache_key = f"roblox-social:get:{url}"
    cached = cache_get(cache_key)

    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.get(url, headers={"Accept": "application/json"})
        response.raise_for_status()
        return cache_set(cache_key, response.json(), ttl)


async def post_json(url: str, payload: dict[str, Any], ttl: float = 120.0) -> Any:
    cache_key = f"roblox-social:post:{url}:{json.dumps(payload, sort_keys=True)}"
    cached = cache_get(cache_key)

    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.post(url, json=payload, headers={"Accept": "application/json"})
        response.raise_for_status()
        return cache_set(cache_key, response.json(), ttl)


async def get_optional_json(url: str, fallback: Any) -> Any:
    try:
        return await get_json(url)
    except httpx.HTTPError:
        return fallback


def valid_user_ids(items: list[dict[str, Any]], limit: int = 24) -> list[int]:
    user_ids: list[int] = []

    for item in items:
        try:
            user_id = int(item.get("id"))
        except (TypeError, ValueError):
            continue

        if user_id > 0 and user_id not in user_ids:
            user_ids.append(user_id)

        if len(user_ids) >= limit:
            break

    return user_ids


async def get_user_details(user_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not user_ids:
        return {}

    data = await post_json(
        "https://users.roblox.com/v1/users",
        {"userIds": user_ids[:100], "excludeBannedUsers": True},
        ttl=300.0,
    )

    return {int(item["id"]): item for item in data.get("data", []) if item.get("id") is not None}


async def get_user_presences(user_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not user_ids:
        return {}

    try:
        data = await post_json(
            "https://presence.roblox.com/v1/presence/users",
            {"userIds": user_ids[:100]},
            ttl=15.0,
        )
    except httpx.HTTPError:
        return {}

    return {
        int(item["userId"]): item
        for item in data.get("userPresences", [])
        if item.get("userId") is not None
    }


async def get_avatar_images(user_ids: list[int], *, headshot: bool = False) -> dict[int, str | None]:
    if not user_ids:
        return {}

    endpoint = "avatar-headshot" if headshot else "avatar"
    size = "150x150" if headshot else "420x420"
    params = httpx.QueryParams(
        {
            "userIds": ",".join(str(user_id) for user_id in user_ids[:100]),
            "size": size,
            "format": "Webp",
            "isCircular": "false",
        }
    )
    data = await get_optional_json(f"https://thumbnails.roblox.com/v1/users/{endpoint}?{params}", {"data": []})

    return {
        int(item["targetId"]): item.get("imageUrl")
        for item in data.get("data", [])
        if item.get("targetId") is not None
    }


async def get_outfit_images(outfit_ids: list[int]) -> dict[int, str | None]:
    if not outfit_ids:
        return {}

    params = httpx.QueryParams(
        {
            "userOutfitIds": ",".join(str(outfit_id) for outfit_id in outfit_ids[:100]),
            "size": "420x420",
            "format": "Webp",
            "isCircular": "false",
        }
    )
    data = await get_optional_json(f"https://thumbnails.roblox.com/v1/users/outfits?{params}", {"data": []})

    return {
        int(item["targetId"]): item.get("imageUrl")
        for item in data.get("data", [])
        if item.get("targetId") is not None
    }


async def get_count(url: str) -> int:
    data = await get_optional_json(url, {"count": 0})

    try:
        return int(data.get("count") or 0)
    except (TypeError, ValueError):
        return 0


def asset_to_dto(asset: dict[str, Any]) -> dict[str, Any]:
    asset_type = asset.get("assetType") or {}

    return {
        "id": asset.get("id"),
        "name": asset.get("name"),
        "typeId": asset_type.get("id"),
        "typeName": asset_type.get("name"),
        "availabilityStatus": asset.get("availabilityStatus"),
    }


def outfit_to_dto(outfit: dict[str, Any], image_url: str | None) -> dict[str, Any]:
    return {
        "id": outfit.get("id"),
        "name": outfit.get("name"),
        "isEditable": bool(outfit.get("isEditable")),
        "outfitType": outfit.get("outfitType"),
        "imageUrl": image_url,
    }


def friend_to_dto(
    friend_id: int,
    details: dict[int, dict[str, Any]],
    images: dict[int, str | None],
    presences: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    detail = details.get(friend_id, {})
    presence = presences.get(friend_id, {})

    return {
        "id": str(friend_id),
        "name": detail.get("name") or f"User {friend_id}",
        "displayName": detail.get("displayName") or detail.get("name") or f"User {friend_id}",
        "hasVerifiedBadge": bool(detail.get("hasVerifiedBadge")),
        "avatarUrl": images.get(friend_id),
        "presence": presence_to_dto(presence),
    }


def presence_to_dto(presence: dict[str, Any]) -> dict[str, Any]:
    presence_type = int(presence.get("userPresenceType") or 0)
    presence_names = {0: "offline", 1: "online", 2: "in_game", 3: "studio"}

    return {
        "type": presence_names.get(presence_type, "offline"),
        "isOnline": presence_type > 0,
        "isInGame": presence_type == 2,
        "lastLocation": presence.get("lastLocation") or None,
        "placeId": str(presence["placeId"]) if presence.get("placeId") else None,
        "rootPlaceId": str(presence["rootPlaceId"]) if presence.get("rootPlaceId") else None,
        "gameId": presence.get("gameId") or None,
        "universeId": str(presence["universeId"]) if presence.get("universeId") else None,
        "lastOnline": presence.get("lastOnline") or None,
    }


async def search_roblox_users(
    query: str,
    *,
    cursor: str | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    normalized_query = query.strip().removeprefix("@").strip()
    params_data = {"keyword": normalized_query, "limit": limit}

    if cursor:
        params_data["cursor"] = cursor

    params = httpx.QueryParams(params_data)
    rate_limited = False
    retry_after: int | None = None

    try:
        data = await get_json(f"https://users.roblox.com/v1/users/search?{params}", ttl=300.0)
    except httpx.HTTPStatusError as error:
        if error.response.status_code != 429:
            raise

        rate_limited = True
        retry_after = retry_after_seconds(error.response)
        exact_match: dict[str, Any] = {"data": []}

        if not cursor:
            try:
                exact_match = await post_json(
                    "https://users.roblox.com/v1/usernames/users",
                    {"usernames": [normalized_query], "excludeBannedUsers": True},
                    ttl=300.0,
                )
            except httpx.HTTPError:
                pass

        data = {
            "data": exact_match.get("data") or [],
            "nextPageCursor": cursor,
        }
    users = (data.get("data") or [])[:limit]
    user_ids = valid_user_ids(users, limit)
    images, presences = await asyncio.gather(
        get_avatar_images(user_ids, headshot=True),
        get_user_presences(user_ids),
    )

    return {
        "query": normalized_query,
        "results": [
            {
                "id": str(user_id),
                "name": user.get("name") or f"User {user_id}",
                "displayName": user.get("displayName") or user.get("name") or f"User {user_id}",
                "hasVerifiedBadge": bool(user.get("hasVerifiedBadge")),
                "previousUsernames": [
                    str(name)
                    for name in (user.get("previousUsernames") or [])
                    if name
                ],
                "avatarUrl": images.get(user_id),
                "presence": presence_to_dto(presences.get(user_id, {})),
            }
            for user in users
            if (user_id := int(user.get("id") or 0)) > 0
        ],
        "nextPageCursor": data.get("nextPageCursor") or None,
        "rateLimited": rate_limited,
        "retryAfterSeconds": retry_after,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
    }


async def get_social_overview(user_id: str) -> dict[str, Any]:
    avatar, outfits_data, friends_data, followers, following, friends_count = await asyncio.gather(
        get_json(f"https://avatar.roblox.com/v2/avatar/users/{user_id}/avatar?checkAssetAvailability=true", ttl=8.0),
        get_optional_json(
            f"https://avatar.roblox.com/v2/avatar/users/{user_id}/outfits?itemsPerPage=12&isEditable=true",
            {"data": [], "paginationToken": None},
        ),
        get_optional_json(f"https://friends.roblox.com/v1/users/{user_id}/friends", {"data": []}),
        get_count(f"https://friends.roblox.com/v1/users/{user_id}/followers/count"),
        get_count(f"https://friends.roblox.com/v1/users/{user_id}/followings/count"),
        get_count(f"https://friends.roblox.com/v1/users/{user_id}/friends/count"),
    )

    friend_ids = valid_user_ids(friends_data.get("data", []), 24)
    outfits = outfits_data.get("data", [])
    outfit_ids = [int(item["id"]) for item in outfits if item.get("id") is not None]
    friend_details, friend_images, friend_presences, user_images, outfit_images = await asyncio.gather(
        get_user_details(friend_ids),
        get_avatar_images(friend_ids, headshot=True),
        get_user_presences(friend_ids),
        get_avatar_images([int(user_id)], headshot=False),
        get_outfit_images(outfit_ids),
    )

    return {
        "userId": user_id,
        "avatarImageUrl": user_images.get(int(user_id)),
        "avatar": {
            "scales": avatar.get("scales"),
            "playerAvatarType": avatar.get("playerAvatarType"),
            "bodyColor3s": avatar.get("bodyColor3s") or avatar.get("bodyColors"),
            "assets": [asset_to_dto(asset) for asset in avatar.get("assets", [])],
            "emotes": avatar.get("emotes", []),
            "defaultShirtApplied": bool(avatar.get("defaultShirtApplied")),
            "defaultPantsApplied": bool(avatar.get("defaultPantsApplied")),
        },
        "outfits": [outfit_to_dto(outfit, outfit_images.get(int(outfit["id"]))) for outfit in outfits if outfit.get("id")],
        "friends": [
            friend_to_dto(friend_id, friend_details, friend_images, friend_presences)
            for friend_id in friend_ids
        ],
        "counts": {
            "friends": friends_count,
            "followers": followers,
            "following": following,
            "outfits": len(outfits),
            "assets": len(avatar.get("assets", [])),
        },
        "syncedAt": datetime.now(timezone.utc).isoformat(),
    }


async def get_public_user_profile(user_id: str) -> dict[str, Any]:
    user_data, social = await asyncio.gather(
        get_json(f"https://users.roblox.com/v1/users/{user_id}", ttl=300.0),
        get_social_overview(user_id),
    )
    synced_at = datetime.now(timezone.utc).isoformat()

    return {
        "user": {
            "id": str(user_data.get("id") or user_id),
            "name": user_data.get("name") or f"User {user_id}",
            "displayName": user_data.get("displayName") or user_data.get("name") or f"User {user_id}",
            "description": user_data.get("description") or None,
            "createdAt": user_data.get("created"),
            "isBanned": bool(user_data.get("isBanned")),
            "hasVerifiedBadge": bool(user_data.get("hasVerifiedBadge")),
            "externalAppDisplayName": user_data.get("externalAppDisplayName"),
            "avatarUrl": social.get("avatarImageUrl"),
        },
        "social": social,
        "syncedAt": synced_at,
    }
