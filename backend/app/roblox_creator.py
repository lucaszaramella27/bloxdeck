from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.roblox import fetch_json, get_details_by_universe_id, get_images_by_universe_id
from app.simple_cache import cache_get, cache_set

CREATOR_CACHE_TTL = 120.0
ANALYTICS_TIMEOUT = 12.0
ANALYTICS_METRICS = {
    "dailyActiveUsers": "DailyActiveUsers",
    "dailyRevenue": "DailyRevenue",
    "d1Retention": "ForwardD1Retention",
}


def utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


async def get_creator_experiences(user_id: str) -> list[dict[str, Any]]:
    cache_key = f"creator-experiences:{user_id}"
    cached = cache_get(cache_key)

    if cached is not None:
        return cached

    params = httpx.QueryParams(
        {
            "accessFilter": "Public",
            "sortOrder": "Desc",
            "limit": "50",
        }
    )
    data = await fetch_json(f"https://games.roblox.com/v2/users/{user_id}/games?{params}")
    items = data.get("data", [])
    universe_ids = [int(item["id"]) for item in items if item.get("id")]
    details, images = await asyncio.gather(
        get_details_by_universe_id(universe_ids),
        get_images_by_universe_id(universe_ids),
    )
    experiences: list[dict[str, Any]] = []

    for item in items:
        universe_id = int(item.get("id") or 0)
        root_place = item.get("rootPlace") or {}
        place_id = root_place.get("id")
        detail = details.get(universe_id, {})

        if universe_id <= 0 or not place_id:
            continue

        experiences.append(
            {
                "universeId": str(universe_id),
                "placeId": str(place_id),
                "name": detail.get("name") or item.get("name") or f"Experiência {universe_id}",
                "description": detail.get("description") or item.get("description") or "",
                "imageUrl": images.get(universe_id),
                "playing": detail.get("playing"),
                "visits": detail.get("visits") if detail.get("visits") is not None else item.get("placeVisits"),
                "favoritedCount": detail.get("favoritedCount"),
                "maxPlayers": detail.get("maxPlayers"),
                "genre": detail.get("genre") or detail.get("genre_l1"),
                "createdAt": detail.get("created") or item.get("created"),
                "updatedAt": detail.get("updated") or item.get("updated"),
                "creator": {
                    "id": str((item.get("creator") or {}).get("id") or user_id),
                    "type": (item.get("creator") or {}).get("type") or "User",
                },
            }
        )

    return cache_set(cache_key, experiences, CREATOR_CACHE_TTL)


def analytics_points(payload: dict[str, Any]) -> list[dict[str, Any]]:
    values = (payload.get("response") or {}).get("values") or []
    points: dict[str, float] = {}

    for series in values:
        for point in series.get("dataPoints") or []:
            time = point.get("time")
            value = point.get("value")

            if isinstance(time, str) and isinstance(value, (int, float)):
                points[time] = points.get(time, 0.0) + float(value)

    return [{"time": time, "value": value} for time, value in sorted(points.items())]


async def query_analytics_metric(
    client: httpx.AsyncClient,
    api_key: str,
    universe_id: str,
    metric: str,
    start_time: datetime,
    end_time: datetime,
) -> dict[str, Any]:
    url = f"https://apis.roblox.com/analytics-query-api/v1/universes/{universe_id}/metrics"
    response = await client.post(
        url,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json={
            "metric": metric,
            "granularity": "OneDay",
            "startTime": utc_iso(start_time),
            "endTime": utc_iso(end_time),
        },
    )
    response.raise_for_status()
    payload = response.json()

    for _ in range(5):
        if payload.get("done", True):
            break

        path = str(payload.get("path") or "").lstrip("/")

        if not path.startswith("v1/universes/"):
            break

        await asyncio.sleep(0.35)
        poll = await client.get(
            f"https://apis.roblox.com/analytics-query-api/{path}",
            headers={"x-api-key": api_key},
        )
        poll.raise_for_status()
        payload = poll.json()

    if payload.get("error"):
        raise ValueError(str((payload.get("error") or {}).get("message") or "Analytics indisponível"))

    points = analytics_points(payload)
    return {
        "available": bool(payload.get("done", True)),
        "points": points,
        "latest": points[-1]["value"] if points else None,
        "total": sum(point["value"] for point in points),
    }


async def get_creator_analytics(universe_id: str, days: int = 30) -> dict[str, Any]:
    settings = get_settings()
    api_key = settings.roblox_open_cloud_api_key

    if not api_key:
        return {
            "configured": False,
            "available": False,
            "reason": "OPEN_CLOUD_KEY_REQUIRED",
            "metrics": {},
        }

    end_time = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    start_time = end_time - timedelta(days=days)

    async with httpx.AsyncClient(timeout=ANALYTICS_TIMEOUT, headers={"User-Agent": "BloxDeck/0.1"}) as client:
        async def safe_query(metric: str) -> dict[str, Any]:
            try:
                return await query_analytics_metric(client, api_key, universe_id, metric, start_time, end_time)
            except (httpx.HTTPError, ValueError) as error:
                return {"available": False, "points": [], "latest": None, "total": None, "error": str(error)}

        results = await asyncio.gather(
            *(safe_query(metric) for metric in ANALYTICS_METRICS.values())
        )

    metrics = {
        key: result
        for key, result in zip(ANALYTICS_METRICS.keys(), results, strict=True)
    }

    return {
        "configured": True,
        "available": any(metric["available"] for metric in metrics.values()),
        "reason": None,
        "range": {"startAt": utc_iso(start_time), "endAt": utc_iso(end_time), "days": days},
        "metrics": metrics,
    }
