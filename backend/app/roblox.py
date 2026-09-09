from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote, urlparse
from uuid import uuid4

import httpx

CACHE_TTL = timedelta(seconds=90)
SEARCH_CACHE_TTL = timedelta(minutes=3)
ENRICH_CACHE_TTL = timedelta(minutes=10)
DISCOVER_ROTATION_SECONDS = 5 * 60 * 60
DISCOVER_PINNED_RATIO = 5
DISCOVER_MAX_PINNED_RESULTS = 6
REQUEST_TIMEOUT = 8.0
ROBLOX_RATE_LIMIT_MESSAGE = "Roblox limitou as requisições por alguns instantes. Mostrando dados parciais."


@dataclass
class RobloxGameSnapshot:
    placeId: str
    universeId: str
    name: str
    description: str
    imageUrl: str | None
    creatorName: str | None
    creatorType: str | None
    creatorVerified: bool
    playing: int | None
    visits: int | None
    maxPlayers: int | None
    favoritedCount: int | None
    genre: str | None
    createdAt: str | None
    updatedAt: str | None
    canonicalUrlPath: str | None
    syncedAt: str

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


@dataclass
class RobloxExperienceResult:
    universeId: str
    placeId: str
    name: str
    description: str
    imageUrl: str | None
    creatorName: str | None
    creatorType: str | None
    creatorVerified: bool
    playing: int | None
    visits: int | None
    maxPlayers: int | None
    favoritedCount: int | None
    totalUpVotes: int | None
    totalDownVotes: int | None
    likeRatio: float | None
    genre: str | None
    minimumAge: int | None
    ageRecommendationDisplayName: str | None
    contentMaturity: str | None
    isSponsored: bool
    canonicalUrlPath: str | None
    createdAt: str | None
    updatedAt: str | None
    source: str
    syncedAt: str

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


@dataclass
class CacheEntry:
    expires_at: datetime
    value: RobloxGameSnapshot | None


@dataclass
class SearchCacheEntry:
    expires_at: datetime
    value: dict[str, Any]


@dataclass
class GenericCacheEntry:
    expires_at: datetime
    value: Any


class RobloxRateLimitError(Exception):
    pass


snapshot_cache: dict[str, CacheEntry] = {}
search_cache: dict[str, SearchCacheEntry] = {}
details_cache: dict[int, GenericCacheEntry] = {}
images_cache: dict[int, GenericCacheEntry] = {}


def is_trusted_roblox_image_url(value: str | None) -> bool:
    if not value:
        return False

    try:
        parsed = urlparse(value)
    except ValueError:
        return False

    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (host == "rbxcdn.com" or host.endswith(".rbxcdn.com"))


def completed_thumbnail_url(thumbnails: list[dict[str, Any]]) -> str | None:
    for thumbnail in thumbnails:
        image_url = thumbnail.get("imageUrl")
        state = str(thumbnail.get("state") or "").lower()

        if state == "completed" and isinstance(image_url, str) and is_trusted_roblox_image_url(image_url):
            return image_url

    return None


def chunk(items: list[int], size: int) -> list[list[int]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def retry_after_seconds(value: str | None, fallback: float) -> float:
    if not value:
        return fallback

    try:
        return max(0.0, min(float(value), 2.0))
    except ValueError:
        return fallback


async def fetch_json(url: str) -> Any:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        for attempt in range(3):
            response = await client.get(url, headers={"Accept": "application/json"})

            if response.status_code == 429:
                if attempt < 2:
                    await asyncio.sleep(retry_after_seconds(response.headers.get("Retry-After"), 0.45 + attempt * 0.35))
                    continue

                raise RobloxRateLimitError(url)

            response.raise_for_status()
            return response.json()

    raise RobloxRateLimitError(url)


async def get_universe_id_for_place(place_id: str) -> int:
    data = await fetch_json(f"https://apis.roblox.com/universes/v1/places/{place_id}/universe")
    universe_id = int(data["universeId"])

    if universe_id <= 0:
        raise ValueError("Invalid universeId")

    return universe_id


async def get_details_by_universe_id(universe_ids: list[int]) -> dict[int, dict[str, Any]]:
    now = datetime.now(timezone.utc)
    details: dict[int, dict[str, Any]] = {}
    missing: list[int] = []

    for universe_id in dict.fromkeys(universe_ids):
        cached = details_cache.get(universe_id)

        if cached and cached.expires_at > now:
            details[universe_id] = cached.value
        else:
            missing.append(universe_id)

    for batch in chunk(missing, 25):
        params = httpx.QueryParams({"universeIds": ",".join(str(item) for item in batch)})

        try:
            data = await fetch_json(f"https://games.roblox.com/v1/games?{params}")
        except RobloxRateLimitError:
            break

        for item in data.get("data", []):
            universe_id = int(item["id"])
            details[universe_id] = item
            details_cache[universe_id] = GenericCacheEntry(
                expires_at=datetime.now(timezone.utc) + ENRICH_CACHE_TTL,
                value=item,
            )

    return details


async def get_images_by_universe_id(universe_ids: list[int]) -> dict[int, str | None]:
    now = datetime.now(timezone.utc)
    images: dict[int, str | None] = {}
    missing: list[int] = []

    for universe_id in dict.fromkeys(universe_ids):
        cached = images_cache.get(universe_id)

        if cached and cached.expires_at > now:
            images[universe_id] = cached.value
        else:
            missing.append(universe_id)

    for batch in chunk(missing, 25):
        params = httpx.QueryParams(
            {
                "universeIds": ",".join(str(item) for item in batch),
                "countPerUniverse": "1",
                "defaults": "false",
                "size": "768x432",
                "format": "Webp",
                "isCircular": "false",
            }
        )

        try:
            data = await fetch_json(f"https://thumbnails.roblox.com/v1/games/multiget/thumbnails?{params}")
        except RobloxRateLimitError:
            break

        for item in data.get("data", []):
            thumbnails = item.get("thumbnails") or []
            image_url = completed_thumbnail_url(thumbnails)
            universe_id = int(item["universeId"])
            images[universe_id] = image_url
            images_cache[universe_id] = GenericCacheEntry(
                expires_at=datetime.now(timezone.utc) + ENRICH_CACHE_TTL,
                value=image_url,
            )

    return images


def to_snapshot(place_id: str, detail: dict[str, Any], image_url: str | None) -> RobloxGameSnapshot:
    creator = detail.get("creator") or {}
    genre = detail.get("genre_l2") or detail.get("genre_l1") or detail.get("genre")

    return RobloxGameSnapshot(
        placeId=place_id,
        universeId=str(detail["id"]),
        name=(detail.get("name") or f"Place {place_id}").strip(),
        description=(detail.get("description") or "Sem descrição pública no Roblox.").strip(),
        imageUrl=image_url,
        creatorName=creator.get("name"),
        creatorType=creator.get("type"),
        creatorVerified=bool(creator.get("hasVerifiedBadge")),
        playing=detail.get("playing"),
        visits=detail.get("visits"),
        maxPlayers=detail.get("maxPlayers"),
        favoritedCount=detail.get("favoritedCount"),
        genre=genre,
        createdAt=detail.get("created"),
        updatedAt=detail.get("updated"),
        canonicalUrlPath=detail.get("canonicalUrlPath"),
        syncedAt=datetime.now(timezone.utc).isoformat(),
    )


def int_or_none(value: Any) -> int | None:
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def like_ratio(up_votes: int | None, down_votes: int | None) -> float | None:
    if up_votes is None or down_votes is None:
        return None

    total = up_votes + down_votes

    if total <= 0:
        return None

    return round((up_votes / total) * 100, 1)


def search_item_to_result(
    item: dict[str, Any],
    *,
    detail: dict[str, Any] | None,
    image_url: str | None,
    source: str,
) -> RobloxExperienceResult | None:
    universe_id = int_or_none(item.get("universeId") or item.get("id") or item.get("contentId"))
    place_id = int_or_none(item.get("rootPlaceId") or item.get("placeId"))

    if universe_id is None or place_id is None:
        return None

    detail_creator = (detail or {}).get("creator") or {}
    up_votes = int_or_none(item.get("totalUpVotes"))
    down_votes = int_or_none(item.get("totalDownVotes"))
    detail_genre = (detail or {}).get("genre_l2") or (detail or {}).get("genre_l1") or (detail or {}).get("genre")
    description = (detail or {}).get("description") or item.get("description") or item.get("gameDescription") or ""
    name = (detail or {}).get("name") or item.get("name") or f"Place {place_id}"

    return RobloxExperienceResult(
        universeId=str(universe_id),
        placeId=str(place_id),
        name=str(name).strip(),
        description=str(description).strip(),
        imageUrl=image_url,
        creatorName=detail_creator.get("name") or item.get("creatorName"),
        creatorType=detail_creator.get("type"),
        creatorVerified=bool(detail_creator.get("hasVerifiedBadge") or item.get("creatorHasVerifiedBadge")),
        playing=int_or_none((detail or {}).get("playing")) or int_or_none(item.get("playerCount")),
        visits=int_or_none((detail or {}).get("visits")),
        maxPlayers=int_or_none((detail or {}).get("maxPlayers")),
        favoritedCount=int_or_none((detail or {}).get("favoritedCount")),
        totalUpVotes=up_votes,
        totalDownVotes=down_votes,
        likeRatio=like_ratio(up_votes, down_votes),
        genre=detail_genre or item.get("genre"),
        minimumAge=int_or_none(item.get("minimumAge")),
        ageRecommendationDisplayName=item.get("ageRecommendationDisplayName"),
        contentMaturity=item.get("contentMaturity"),
        isSponsored=bool(item.get("isSponsored")),
        canonicalUrlPath=(detail or {}).get("canonicalUrlPath") or item.get("canonicalUrlPath"),
        createdAt=(detail or {}).get("created"),
        updatedAt=(detail or {}).get("updated"),
        source=source,
        syncedAt=datetime.now(timezone.utc).isoformat(),
    )


def unique_game_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[int] = set()

    for item in items:
        universe_id = int_or_none(item.get("universeId") or item.get("id") or item.get("contentId"))

        if universe_id is None or universe_id in seen:
            continue

        seen.add(universe_id)
        result.append(item)

    return result


async def enrich_experience_items(items: list[dict[str, Any]], source: str) -> list[dict[str, Any]]:
    unique_items = unique_game_items(items)
    universe_ids = [
        universe_id
        for universe_id in (int_or_none(item.get("universeId") or item.get("id") or item.get("contentId")) for item in unique_items)
        if universe_id is not None
    ]
    details_by_universe_id = await get_details_by_universe_id(universe_ids) if universe_ids else {}
    images_by_universe_id = await get_images_by_universe_id(universe_ids) if universe_ids else {}
    results: list[dict[str, Any]] = []

    for item in unique_items:
        universe_id = int_or_none(item.get("universeId") or item.get("id") or item.get("contentId"))

        if universe_id is None:
            continue

        result = search_item_to_result(
            item,
            detail=details_by_universe_id.get(universe_id),
            image_url=images_by_universe_id.get(universe_id),
            source=source,
        )

        if result is not None:
            results.append(result.to_dict())

    return results


def cached_search_response(cache_key: str, *, allow_stale: bool = False) -> dict[str, Any] | None:
    cached = search_cache.get(cache_key)

    if cached and (allow_stale or cached.expires_at > datetime.now(timezone.utc)):
        return cached.value

    return None


def rate_limited_response(cache_key: str, *, source: str, **extra: Any) -> dict[str, Any]:
    cached = cached_search_response(cache_key, allow_stale=True)

    if cached is not None:
        return {
            **cached,
            "rateLimited": True,
            "message": ROBLOX_RATE_LIMIT_MESSAGE,
            "syncedAt": cached.get("syncedAt") or datetime.now(timezone.utc).isoformat(),
        }

    return {
        **extra,
        "results": [],
        "nextPageToken": None,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "rateLimited": True,
        "message": ROBLOX_RATE_LIMIT_MESSAGE,
    }


def set_search_cache(cache_key: str, value: dict[str, Any]) -> dict[str, Any]:
    search_cache[cache_key] = SearchCacheEntry(
        expires_at=datetime.now(timezone.utc) + SEARCH_CACHE_TTL,
        value=value,
    )
    return value


def get_discover_rotation(now: datetime | None = None) -> tuple[int, datetime]:
    current = now or datetime.now(timezone.utc)

    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    rotation_id = int(current.timestamp()) // DISCOVER_ROTATION_SECONDS
    rotates_at = datetime.fromtimestamp(
        (rotation_id + 1) * DISCOVER_ROTATION_SECONDS,
        tz=timezone.utc,
    )
    return rotation_id, rotates_at


def rotate_discover_items(
    items: list[dict[str, Any]],
    *,
    sort_id: str,
    limit: int,
    rotation_id: int,
) -> list[dict[str, Any]]:
    result_limit = min(max(limit, 0), len(items))

    if result_limit == 0:
        return []

    pinned_count = min(
        DISCOVER_MAX_PINNED_RESULTS,
        max(1, result_limit // DISCOVER_PINNED_RATIO),
        result_limit,
    )
    pinned = items[:pinned_count]
    candidates = items[pinned_count:]
    rotating_count = result_limit - pinned_count

    if rotating_count <= 0 or rotating_count >= len(candidates):
        return items[:result_limit]

    seed = int.from_bytes(
        hashlib.sha256(sort_id.encode("utf-8")).digest()[:8],
        byteorder="big",
    )
    step = max(1, rotating_count - 1)
    offset = (seed + rotation_id * step) % len(candidates)
    selected_indexes = {
        (offset + index) % len(candidates)
        for index in range(rotating_count)
    }
    rotating = [
        item
        for index, item in enumerate(candidates)
        if index in selected_indexes
    ]
    return [*pinned, *rotating]


async def search_roblox_experiences(query: str, *, cursor: str | None = None, limit: int = 40) -> dict[str, Any]:
    normalized_query = query.strip()

    if not normalized_query:
        return {
            "query": normalized_query,
            "results": [],
            "nextPageToken": None,
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "source": "search",
        }

    cache_key = f"search:{normalized_query.lower()}:{cursor or ''}:{limit}"
    cached = cached_search_response(cache_key)

    if cached is not None:
        return cached

    params = {
        "searchQuery": normalized_query,
        "sessionId": str(uuid4()),
    }

    if cursor:
        params["pageToken"] = cursor

    try:
        data = await fetch_json(f"https://apis.roblox.com/search-api/omni-search?{httpx.QueryParams(params)}")
    except RobloxRateLimitError:
        return rate_limited_response(cache_key, source="search", query=normalized_query)

    items: list[dict[str, Any]] = []

    for group in data.get("searchResults", []):
        if group.get("contentGroupType") != "Game":
            continue

        items.extend(group.get("contents") or [])

    results = await enrich_experience_items(items[:limit], "search")
    return set_search_cache(
        cache_key,
        {
            "query": normalized_query,
            "results": results,
            "nextPageToken": data.get("nextPageToken"),
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "source": "search",
        },
    )


async def get_roblox_discover(sort_id: str = "top-playing-now", *, limit: int = 50) -> dict[str, Any]:
    rotation_id, rotates_at = get_discover_rotation()
    cache_key = f"discover:{sort_id}:{limit}:{rotation_id}"
    cached = cached_search_response(cache_key)

    if cached is not None:
        return cached

    params = httpx.QueryParams(
        {
            "sortId": sort_id,
            "sessionId": str(uuid4()),
            "device": "computer",
            "country": "all",
        }
    )
    try:
        data = await fetch_json(f"https://apis.roblox.com/explore-api/v1/get-sort-content?{params}")
    except RobloxRateLimitError:
        previous_cache_key = f"discover:{sort_id}:{limit}:{rotation_id - 1}"
        previous = cached_search_response(previous_cache_key, allow_stale=True)

        if previous is not None:
            return {
                **previous,
                "rotationId": rotation_id,
                "rotatesAt": rotates_at.isoformat(),
                "rateLimited": True,
                "message": ROBLOX_RATE_LIMIT_MESSAGE,
            }

        return rate_limited_response(
            cache_key,
            source="discover",
            sortId=sort_id,
            sortDisplayName=sort_id,
            subtitle=None,
            rotationId=rotation_id,
            rotatesAt=rotates_at.isoformat(),
        )

    selected_games = rotate_discover_items(
        data.get("games") or [],
        sort_id=sort_id,
        limit=limit,
        rotation_id=rotation_id,
    )
    results = await enrich_experience_items(selected_games, "discover")

    return set_search_cache(
        cache_key,
        {
            "sortId": data.get("sortId") or sort_id,
            "sortDisplayName": data.get("sortDisplayName") or sort_id,
            "subtitle": data.get("subtitle"),
            "results": results,
            "nextPageToken": data.get("nextPageToken"),
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "source": "discover",
            "rotationId": rotation_id,
            "rotatesAt": rotates_at.isoformat(),
        },
    )


async def get_roblox_autocomplete(query: str) -> dict[str, Any]:
    normalized_query = query.strip()

    if not normalized_query:
        return {"query": normalized_query, "suggestions": []}

    cache_key = f"autocomplete:{normalized_query.lower()}"
    cached = cached_search_response(cache_key)

    if cached is not None:
        return cached

    try:
        data = await fetch_json(
            "https://apis.roblox.com/games-autocomplete/v1/get-suggestion/"
            f"{quote(normalized_query, safe='')}"
        )
    except RobloxRateLimitError:
        cached = cached_search_response(cache_key, allow_stale=True)
        return cached or {
            "query": normalized_query,
            "suggestions": [],
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "rateLimited": True,
            "message": ROBLOX_RATE_LIMIT_MESSAGE,
        }
    suggestions = [
        {
            "query": item.get("searchQuery"),
            "universeId": item.get("universeId") or None,
            "title": item.get("canonicalTitle"),
            "thumbnailUrl": item.get("thumbnailUrl"),
        }
        for item in data.get("entries", [])
        if item.get("searchQuery")
    ]

    return set_search_cache(
        cache_key,
        {
            "query": normalized_query,
            "suggestions": suggestions,
            "syncedAt": datetime.now(timezone.utc).isoformat(),
        },
    )


async def get_roblox_snapshots_for_places(place_ids: list[str]) -> dict[str, RobloxGameSnapshot | None]:
    now = datetime.now(timezone.utc)
    result: dict[str, RobloxGameSnapshot | None] = {}
    missing: list[str] = []

    for place_id in dict.fromkeys(filter(None, place_ids)):
        cached = snapshot_cache.get(place_id)

        if cached and cached.expires_at > now:
            result[place_id] = cached.value
        else:
            missing.append(place_id)

    universe_by_place_id: dict[str, int] = {}

    for place_id in missing:
        try:
            universe_by_place_id[place_id] = await get_universe_id_for_place(place_id)
        except Exception:
            universe_by_place_id.pop(place_id, None)

    universe_ids = list(dict.fromkeys(universe_by_place_id.values()))
    try:
        details_by_universe_id = await get_details_by_universe_id(universe_ids) if universe_ids else {}
        images_by_universe_id = await get_images_by_universe_id(universe_ids) if universe_ids else {}
    except RobloxRateLimitError:
        details_by_universe_id = {}
        images_by_universe_id = {}

    for place_id in missing:
        universe_id = universe_by_place_id.get(place_id)
        detail = details_by_universe_id.get(universe_id) if universe_id else None
        value = to_snapshot(place_id, detail, images_by_universe_id.get(int(detail["id"]))) if detail else None
        snapshot_cache[place_id] = CacheEntry(expires_at=datetime.now(timezone.utc) + CACHE_TTL, value=value)
        result[place_id] = value

    return result


async def get_roblox_snapshot_for_place(place_id: str) -> RobloxGameSnapshot | None:
    snapshots = await get_roblox_snapshots_for_places([place_id])
    return snapshots.get(place_id)
