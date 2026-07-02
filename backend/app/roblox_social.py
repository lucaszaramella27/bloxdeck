from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

REQUEST_TIMEOUT = 8.0


async def get_json(url: str) -> Any:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.get(url, headers={"Accept": "application/json"})
        response.raise_for_status()
        return response.json()


async def post_json(url: str, payload: dict[str, Any]) -> Any:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.post(url, json=payload, headers={"Accept": "application/json"})
        response.raise_for_status()
        return response.json()


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
    )

    return {int(item["id"]): item for item in data.get("data", []) if item.get("id") is not None}


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


def friend_to_dto(friend_id: int, details: dict[int, dict[str, Any]], images: dict[int, str | None]) -> dict[str, Any]:
    detail = details.get(friend_id, {})

    return {
        "id": str(friend_id),
        "name": detail.get("name") or f"User {friend_id}",
        "displayName": detail.get("displayName") or detail.get("name") or f"User {friend_id}",
        "hasVerifiedBadge": bool(detail.get("hasVerifiedBadge")),
        "avatarUrl": images.get(friend_id),
    }


async def get_social_overview(user_id: str) -> dict[str, Any]:
    avatar = await get_json(f"https://avatar.roblox.com/v2/avatar/users/{user_id}/avatar?checkAssetAvailability=true")
    outfits_data = await get_optional_json(
        f"https://avatar.roblox.com/v2/avatar/users/{user_id}/outfits?itemsPerPage=12&isEditable=true",
        {"data": [], "paginationToken": None},
    )
    friends_data = await get_optional_json(f"https://friends.roblox.com/v1/users/{user_id}/friends", {"data": []})
    followers = await get_count(f"https://friends.roblox.com/v1/users/{user_id}/followers/count")
    following = await get_count(f"https://friends.roblox.com/v1/users/{user_id}/followings/count")
    friends_count = await get_count(f"https://friends.roblox.com/v1/users/{user_id}/friends/count")

    friend_ids = valid_user_ids(friends_data.get("data", []), 24)
    friend_details = await get_user_details(friend_ids)
    friend_images = await get_avatar_images(friend_ids, headshot=True)
    user_images = await get_avatar_images([int(user_id)], headshot=False)

    outfits = outfits_data.get("data", [])
    outfit_ids = [int(item["id"]) for item in outfits if item.get("id") is not None]
    outfit_images = await get_outfit_images(outfit_ids)

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
        "friends": [friend_to_dto(friend_id, friend_details, friend_images) for friend_id in friend_ids],
        "counts": {
            "friends": friends_count,
            "followers": followers,
            "following": following,
            "outfits": len(outfits),
            "assets": len(avatar.get("assets", [])),
        },
        "syncedAt": datetime.now(timezone.utc).isoformat(),
    }
