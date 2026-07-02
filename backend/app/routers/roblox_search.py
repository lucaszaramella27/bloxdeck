from __future__ import annotations

from fastapi import APIRouter, Query

from app.roblox import get_roblox_autocomplete, get_roblox_discover, search_roblox_experiences

router = APIRouter(prefix="/roblox", tags=["roblox"])


@router.get("/search")
async def search_experiences(
    q: str = Query(min_length=1, max_length=80),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=40, ge=1, le=50),
) -> dict[str, dict]:
    return {"data": await search_roblox_experiences(q, cursor=cursor, limit=limit)}


@router.get("/discover")
async def discover_experiences(
    sortId: str = Query(default="top-playing-now", max_length=80),
    limit: int = Query(default=50, ge=1, le=50),
) -> dict[str, dict]:
    return {"data": await get_roblox_discover(sortId, limit=limit)}


@router.get("/autocomplete")
async def autocomplete(q: str = Query(min_length=1, max_length=80)) -> dict[str, dict]:
    return {"data": await get_roblox_autocomplete(q)}
