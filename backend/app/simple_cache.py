from __future__ import annotations

from time import monotonic
from typing import Any

CacheEntry = tuple[float, Any]

_cache: dict[str, CacheEntry] = {}


def cache_get(key: str) -> Any | None:
    entry = _cache.get(key)

    if entry is None:
        return None

    expires_at, value = entry

    if expires_at <= monotonic():
        _cache.pop(key, None)
        return None

    return value


def cache_set(key: str, value: Any, ttl_seconds: float) -> Any:
    _cache[key] = (monotonic() + ttl_seconds, value)

    if len(_cache) > 1000:
        prune_cache()

    return value


def prune_cache() -> None:
    now = monotonic()
    expired = [key for key, (expires_at, _value) in _cache.items() if expires_at <= now]

    for key in expired:
        _cache.pop(key, None)
