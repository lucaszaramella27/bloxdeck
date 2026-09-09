from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from app.errors import bad_request
from app.simple_cache import cache_get, cache_set

CATALOG_BASE_URL = "https://catalog.roblox.com"
CLOUD_BASE_URL = "https://apis.roblox.com"
THUMBNAILS_BASE_URL = "https://thumbnails.roblox.com"
REQUEST_TIMEOUT = 10.0

INVENTORY_CATEGORY_FILTERS = {
    "all": "inventoryItemAssetTypes=*",
    "clothing": (
        "inventoryItemAssetTypes=CLASSIC_TSHIRT,CLASSIC_SHIRT,CLASSIC_PANTS,"
        "TSHIRT_ACCESSORY,SHIRT_ACCESSORY,PANTS_ACCESSORY,JACKET_ACCESSORY,"
        "SWEATER_ACCESSORY,SHORTS_ACCESSORY,DRESS_SKIRT_ACCESSORY,"
        "LEFT_SHOE_ACCESSORY,RIGHT_SHOE_ACCESSORY"
    ),
    "accessories": (
        "inventoryItemAssetTypes=HAT,HAIR_ACCESSORY,FACE_ACCESSORY,NECK_ACCESSORY,"
        "SHOULDER_ACCESSORY,FRONT_ACCESSORY,BACK_ACCESSORY,WAIST_ACCESSORY,"
        "EYEBROW_ACCESSORY,EYELASH_ACCESSORY"
    ),
    "body": "inventoryItemAssetTypes=DYNAMIC_HEAD",
    "animations": (
        "inventoryItemAssetTypes=CLIMB_ANIMATION,DEATH_ANIMATION,FALL_ANIMATION,"
        "IDLE_ANIMATION,JUMP_ANIMATION,RUN_ANIMATION,SWIM_ANIMATION,WALK_ANIMATION,"
        "POSE_ANIMATION,MOOD_ANIMATION"
    ),
    "emotes": "inventoryItemAssetTypes=EMOTE_ANIMATION",
    "gear": "inventoryItemAssetTypes=GEAR",
    "collectibles": "onlyCollectibles=true;inventoryItemAssetTypes=*",
}
CATEGORY_TYPE_NAMES = {
    "clothing": {
        "TSHIRT",
        "TEESHIRT",
        "CLASSICTSHIRT",
        "CLASSICTEESHIRT",
        "CLASSICSHIRT",
        "CLASSICPANTS",
        "SHIRT",
        "PANTS",
        "TSHIRTACCESSORY",
        "TEESHIRTACCESSORY",
        "SHIRTACCESSORY",
        "PANTSACCESSORY",
        "JACKETACCESSORY",
        "SWEATERACCESSORY",
        "SHORTSACCESSORY",
        "DRESSSKIRTACCESSORY",
        "LEFTSHOEACCESSORY",
        "RIGHTSHOEACCESSORY",
    },
    "accessories": {
        "HAT",
        "HAIRACCESSORY",
        "FACEACCESSORY",
        "NECKACCESSORY",
        "SHOULDERACCESSORY",
        "FRONTACCESSORY",
        "BACKACCESSORY",
        "WAISTACCESSORY",
        "EARACCESSORY",
        "EYEACCESSORY",
        "EYEBROWACCESSORY",
        "EYELASHACCESSORY",
        "FACEMAKEUP",
        "LIPMAKEUP",
        "EYEMAKEUP",
    },
    "body": {
        "HEAD",
        "FACE",
        "TORSO",
        "RIGHTARM",
        "LEFTARM",
        "LEFTLEG",
        "RIGHTLEG",
        "PACKAGE",
        "DYNAMICHEAD",
    },
    "animations": {
        "ANIMATION",
        "CLIMBANIMATION",
        "DEATHANIMATION",
        "FALLANIMATION",
        "IDLEANIMATION",
        "JUMPANIMATION",
        "RUNANIMATION",
        "SWIMANIMATION",
        "WALKANIMATION",
        "POSEANIMATION",
        "MOODANIMATION",
    },
    "emotes": {"EMOTEANIMATION"},
    "gear": {"GEAR"},
}
ASSET_TYPE_ID_NAMES = {
    2: "CLASSIC_TSHIRT",
    8: "HAT",
    11: "CLASSIC_SHIRT",
    12: "CLASSIC_PANTS",
    17: "HEAD",
    18: "FACE",
    19: "GEAR",
    24: "ANIMATION",
    27: "TORSO",
    28: "RIGHT_ARM",
    29: "LEFT_ARM",
    30: "LEFT_LEG",
    31: "RIGHT_LEG",
    32: "PACKAGE",
    41: "HAIR_ACCESSORY",
    42: "FACE_ACCESSORY",
    43: "NECK_ACCESSORY",
    44: "SHOULDER_ACCESSORY",
    45: "FRONT_ACCESSORY",
    46: "BACK_ACCESSORY",
    47: "WAIST_ACCESSORY",
    48: "CLIMB_ANIMATION",
    49: "DEATH_ANIMATION",
    50: "FALL_ANIMATION",
    51: "IDLE_ANIMATION",
    52: "JUMP_ANIMATION",
    53: "RUN_ANIMATION",
    54: "SWIM_ANIMATION",
    55: "WALK_ANIMATION",
    56: "POSE_ANIMATION",
    57: "EAR_ACCESSORY",
    58: "EYE_ACCESSORY",
    61: "EMOTE_ANIMATION",
    64: "TSHIRT_ACCESSORY",
    65: "SHIRT_ACCESSORY",
    66: "PANTS_ACCESSORY",
    67: "JACKET_ACCESSORY",
    68: "SWEATER_ACCESSORY",
    69: "SHORTS_ACCESSORY",
    70: "LEFT_SHOE_ACCESSORY",
    71: "RIGHT_SHOE_ACCESSORY",
    72: "DRESS_SKIRT_ACCESSORY",
    76: "EYEBROW_ACCESSORY",
    77: "EYELASH_ACCESSORY",
    78: "MOOD_ANIMATION",
    79: "DYNAMIC_HEAD",
    88: "FACE_MAKEUP",
    89: "LIP_MAKEUP",
    90: "EYE_MAKEUP",
}


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_int(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


def parse_id_from_path(path: str | None) -> int | None:
    if not path:
        return None

    matches = re.findall(r"\d+", path)
    if not matches:
        return None

    return parse_int(matches[-1])


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def first_text(source: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = source.get(key)

        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def normalize_type_name(value: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper()) if value else ""


def category_for_type(asset_type: str | None, kind: str) -> str:
    if kind != "asset":
        return kind

    normalized = normalize_type_name(asset_type)

    for category, type_names in CATEGORY_TYPE_NAMES.items():
        if normalized in type_names:
            return category

    return "other"


def inventory_category_filter(category: str | None) -> str | None:
    if not category:
        return None

    normalized = category.strip().lower()

    if normalized not in INVENTORY_CATEGORY_FILTERS:
        raise bad_request("Categoria de inventario invalida.")

    return INVENTORY_CATEGORY_FILTERS[normalized]


def roblox_error_detail(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text[:220] or f"HTTP {response.status_code}"

    errors = payload.get("errors") if isinstance(payload, dict) else None
    if isinstance(errors, list) and errors:
        first = errors[0]

        if isinstance(first, dict):
            message = first.get("message") or first.get("userFacingMessage") or first.get("code")
            if message:
                return str(message)

    if isinstance(payload, dict):
        message = payload.get("message") or payload.get("error") or payload.get("error_description")
        if message:
            return str(message)

    return f"HTTP {response.status_code}"


def raise_roblox_error(response: httpx.Response, action: str) -> None:
    detail = roblox_error_detail(response)

    if response.status_code in {401, 403}:
        raise bad_request(
            f"Roblox negou {action}. Reconecte a conta e confira as permissoes OAuth do app. Detalhe: {detail}"
        )

    raise bad_request(f"Nao consegui {action} no Roblox. Detalhe: {detail}")


async def authed_request_json(
    method: str,
    url: str,
    access_token: str,
    *,
    action: str,
    json_body: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    cache_ttl: float | None = None,
) -> Any:
    cache_key = None

    if cache_ttl and method.upper() == "GET":
        cache_key = f"roblox-authed:{method}:{url}:{httpx.QueryParams(params or {})}"
        cached = cache_get(cache_key)

        if cached is not None:
            return cached

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "BloxDeck/0.1",
    }

    if json_body is not None:
        headers["Content-Type"] = "application/json"

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.request(method, url, params=params, json=json_body, headers=headers)

        csrf_token = response.headers.get("x-csrf-token")
        if response.status_code == 403 and csrf_token:
            response = await client.request(
                method,
                url,
                params=params,
                json=json_body,
                headers={**headers, "x-csrf-token": csrf_token},
            )

    if response.status_code >= 400:
        raise_roblox_error(response, action)

    if response.status_code == 204 or not response.content:
        return {}

    data = response.json()

    if cache_key:
        cache_set(cache_key, data, cache_ttl)

    return data


async def public_get_json(url: str, *, action: str, fallback: Any | None = None) -> Any:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.get(url, headers={"Accept": "application/json"})

    if response.status_code >= 400:
        if fallback is not None:
            return fallback

        raise_roblox_error(response, action)

    return response.json()


async def get_asset_images(asset_ids: list[int]) -> dict[int, str | None]:
    clean_ids = list(dict.fromkeys(asset_id for asset_id in asset_ids if asset_id > 0))[:100]

    if not clean_ids:
        return {}

    results: dict[int, str | None] = {}
    missing_ids: list[int] = []

    for asset_id in clean_ids:
        cached = cache_get(f"roblox-asset-image:{asset_id}")

        if cached is not None:
            results[asset_id] = cached
            continue

        missing_ids.append(asset_id)

    if not missing_ids:
        return results

    params = httpx.QueryParams(
        {
            "assetIds": ",".join(str(asset_id) for asset_id in missing_ids),
            "size": "150x150",
            "format": "Webp",
            "isCircular": "false",
        }
    )
    data = await public_get_json(
        f"{THUMBNAILS_BASE_URL}/v1/assets?{params}",
        action="buscar imagens do inventario",
        fallback={"data": []},
    )

    fetched = {
        int(item["targetId"]): item.get("imageUrl")
        for item in data.get("data", [])
        if item.get("targetId") is not None
    }

    for asset_id, image_url in fetched.items():
        results[asset_id] = image_url
        cache_set(f"roblox-asset-image:{asset_id}", image_url, 1800.0)

    return results


async def get_catalog_item_details(asset_ids: list[int]) -> dict[int, dict[str, Any]]:
    clean_ids = list(dict.fromkeys(asset_id for asset_id in asset_ids if asset_id > 0))[:100]

    if not clean_ids:
        return {}

    results: dict[int, dict[str, Any]] = {}
    missing_ids: list[int] = []

    for asset_id in clean_ids:
        cached = cache_get(f"roblox-catalog-item:{asset_id}")

        if cached is not None:
            results[asset_id] = cached
            continue

        missing_ids.append(asset_id)

    if not missing_ids:
        return results

    payload = {"items": [{"itemType": "Asset", "id": asset_id} for asset_id in missing_ids]}

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.post(f"{CATALOG_BASE_URL}/v1/catalog/items/details", json=payload)

        if response.status_code == 403 and response.headers.get("x-csrf-token"):
            response = await client.post(
                f"{CATALOG_BASE_URL}/v1/catalog/items/details",
                json=payload,
                headers={"x-csrf-token": response.headers["x-csrf-token"]},
            )

    if response.status_code >= 400:
        return {}

    data = response.json()

    fetched = {
        int(item["id"]): item
        for item in data.get("data", [])
        if item.get("id") is not None
    }

    for asset_id, detail in fetched.items():
        results[asset_id] = detail
        cache_set(f"roblox-catalog-item:{asset_id}", detail, 1800.0)

    return results


def asset_type_from_catalog(catalog_detail: dict[str, Any] | None) -> str | None:
    if not catalog_detail:
        return None

    asset_type = catalog_detail.get("assetType")

    if isinstance(asset_type, int):
        return ASSET_TYPE_ID_NAMES.get(asset_type)

    if isinstance(asset_type, str):
        return asset_type

    return None


def inventory_item_to_dto(
    item: dict[str, Any],
    image_url: str | None,
    catalog_detail: dict[str, Any] | None = None,
    requested_category: str | None = None,
) -> dict[str, Any]:
    asset_details = as_dict(item.get("assetDetails"))
    badge_details = as_dict(item.get("badgeDetails"))
    game_pass_details = as_dict(item.get("gamePassDetails"))
    private_server_details = as_dict(item.get("privateServerDetails"))
    path = item.get("path") if isinstance(item.get("path"), str) else None
    kind = "unknown"
    details = asset_details

    if asset_details:
        kind = "asset"
    elif badge_details:
        kind = "badge"
        details = badge_details
    elif game_pass_details:
        kind = "gamePass"
        details = game_pass_details
    elif private_server_details:
        kind = "privateServer"
        details = private_server_details

    asset_id = parse_int(asset_details.get("assetId") or asset_details.get("id")) or (
        parse_id_from_path(path) if kind == "asset" else None
    )
    raw_asset_type = (
        asset_details.get("inventoryItemAssetType")
        or asset_details.get("assetType")
        or asset_details.get("type")
        or asset_type_from_catalog(catalog_detail)
    )
    asset_type = (
        first_text(raw_asset_type, ("name", "displayName"))
        if isinstance(raw_asset_type, dict)
        else str(raw_asset_type)
        if raw_asset_type is not None
        else None
    )
    name = (
        first_text(catalog_detail or {}, ("name", "displayName"))
        or first_text(asset_details, ("displayName", "name", "title"))
        or first_text(details, ("displayName", "name", "title"))
        or (f"Asset {asset_id}" if asset_id else None)
        or path
        or "Item Roblox"
    )
    display_type = asset_type or first_text(details, ("categoryType", "type"))
    inferred_category = category_for_type(display_type, kind)
    category = requested_category if requested_category not in {None, "all", "collectibles"} else inferred_category

    return {
        "id": path or str(asset_id or name),
        "path": path,
        "kind": kind,
        "category": category,
        "assetId": asset_id,
        "name": name,
        "type": display_type,
        "creatorName": first_text(catalog_detail or {}, ("creatorName",)),
        "isLimited": bool(catalog_detail.get("collectibleItemId") if catalog_detail else False),
        "imageUrl": image_url,
        "createdAt": item.get("addTime") or item.get("createdTime") or item.get("createdAt"),
        "isWearable": kind == "asset" and asset_id is not None,
    }


async def get_inventory_items(
    user_id: str,
    access_token: str,
    *,
    cursor: str | None = None,
    limit: int = 48,
    filter_value: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"maxPageSize": max(1, min(limit, 100))}

    if cursor:
        params["pageToken"] = cursor

    category_filter = inventory_category_filter(category)
    effective_filter = filter_value or category_filter

    if effective_filter:
        params["filter"] = effective_filter

    data = await authed_request_json(
        "GET",
        f"{CLOUD_BASE_URL}/cloud/v2/users/{user_id}/inventory-items",
        access_token,
        params=params,
        action="carregar inventario",
        cache_ttl=45.0,
    )
    raw_items = data.get("inventoryItems", []) if isinstance(data, dict) else []
    asset_ids = [
        parse_int(as_dict(item.get("assetDetails")).get("assetId") or as_dict(item.get("assetDetails")).get("id"))
        or parse_id_from_path(item.get("path") if isinstance(item.get("path"), str) else None)
        for item in raw_items
        if isinstance(item, dict)
    ]
    valid_asset_ids = [asset_id for asset_id in asset_ids if asset_id is not None]
    images, catalog_details = await asyncio.gather(
        get_asset_images(valid_asset_ids),
        get_catalog_item_details(valid_asset_ids),
    )

    return {
        "items": [
            inventory_item_to_dto(
                item,
                images.get(asset_id) if asset_id is not None else None,
                catalog_details.get(asset_id) if asset_id is not None else None,
                category,
            )
            for item, asset_id in zip(raw_items, asset_ids)
            if isinstance(item, dict)
        ],
        "nextPageToken": data.get("nextPageToken") if isinstance(data, dict) else None,
        "category": category or None,
        "syncedAt": utc_iso(),
    }

