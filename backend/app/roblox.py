from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote
from uuid import uuid4

import httpx

CACHE_TTL = timedelta(seconds=30)
SEARCH_CACHE_TTL = timedelta(seconds=15)
REQUEST_TIMEOUT = 8.0


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


snapshot_cache: dict[str, CacheEntry] = {}
search_cache: dict[str, SearchCacheEntry] = {}


def chunk(items: list[int], size: int) -> list[list[int]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


async def fetch_json(url: str) -> Any:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        response = await client.get(url, headers={"Accept": "application/json"})
        response.raise_for_status()
        return response.json()


async def get_universe_id_for_place(place_id: str) -> int:
    data = await fetch_json(f"https://apis.roblox.com/universes/v1/places/{place_id}/universe")
    universe_id = int(data["universeId"])

    if universe_id <= 0:
        raise ValueError("Invalid universeId")

    return universe_id


async def get_details_by_universe_id(universe_ids: list[int]) -> dict[int, dict[str, Any]]:
    details: dict[int, dict[str, Any]] = {}

    for batch in chunk(universe_ids, 50):
        params = httpx.QueryParams({"universeIds": ",".join(str(item) for item in batch)})
        data = await fetch_json(f"https://games.roblox.com/v1/games?{params}")

        for item in data.get("data", []):
            details[int(item["id"])] = item

    return details


async def get_images_by_universe_id(universe_ids: list[int]) -> dict[int, str | None]:
    images: dict[int, str | None] = {}

    for batch in chunk(universe_ids, 50):
        params = httpx.QueryParams(
            {
                "universeIds": ",".join(str(item) for item in batch),
                "countPerUniverse": "1",
                "defaults": "true",
                "size": "768x432",
                "format": "Webp",
                "isCircular": "false",
            }
        )
        data = await fetch_json(f"https://thumbnails.roblox.com/v1/games/multiget/thumbnails?{params}")

        for item in data.get("data", []):
            thumbnails = item.get("thumbnails") or []
            image_url = next((thumbnail.get("imageUrl") for thumbnail in thumbnails if thumbnail.get("imageUrl")), None)
            images[int(item["universeId"])] = image_url

    return images


def to_snapshot(place_id: str, detail: dict[str, Any], image_url: str | None) -> RobloxGameSnapshot:
    creator = detail.get("creator") or {}
    genre = detail.get("genre_l2") or detail.get("genre_l1") or detail.get("genre")

    return RobloxGameSnapshot(
        placeId=place_id,
        universeId=str(detail["id"]),
        name=(detail.get("name") or f"Place {place_id}").strip(),
        description=(detail.get("description") or "Sem descricao publica no Roblox.").strip(),
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


def cached_search_response(cache_key: str) -> dict[str, Any] | None:
    cached = search_cache.get(cache_key)

    if cached and cached.expires_at > datetime.now(timezone.utc):
        return cached.value

    return None


def set_search_cache(cache_key: str, value: dict[str, Any]) -> dict[str, Any]:
    search_cache[cache_key] = SearchCacheEntry(
        expires_at=datetime.now(timezone.utc) + SEARCH_CACHE_TTL,
        value=value,
    )
    return value


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

    data = await fetch_json(f"https://apis.roblox.com/search-api/omni-search?{httpx.QueryParams(params)}")
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
    cache_key = f"discover:{sort_id}:{limit}"
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
    data = await fetch_json(f"https://apis.roblox.com/explore-api/v1/get-sort-content?{params}")
    results = await enrich_experience_items((data.get("games") or [])[:limit], "discover")

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

    data = await fetch_json(
        "https://apis.roblox.com/games-autocomplete/v1/get-suggestion/"
        f"{quote(normalized_query, safe='')}"
    )
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
    details_by_universe_id = await get_details_by_universe_id(universe_ids) if universe_ids else {}
    images_by_universe_id = await get_images_by_universe_id(universe_ids) if universe_ids else {}

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
