from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "service": "bloxdeck-api", "timestamp": datetime.now(timezone.utc).isoformat()}
