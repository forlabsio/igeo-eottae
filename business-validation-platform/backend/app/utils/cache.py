import json
import hashlib
import os
from typing import Optional, Any


def _get_redis_client():
    """Get Redis client, returns None if Redis not available."""
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        return client
    except Exception:
        return None


def _make_cache_key(website_url: str, industry: str, region: str) -> str:
    """Create a cache key from analysis parameters."""
    raw = f"{website_url.lower().strip()}:{industry}:{region}"
    return f"bizvalidation:analysis:{hashlib.md5(raw.encode()).hexdigest()}"


def get_cached_analysis(website_url: str, industry: str, region: str) -> Optional[dict]:
    """Retrieve cached analysis result. Returns None if not found or Redis unavailable."""
    client = _get_redis_client()
    if not client:
        return None
    try:
        key = _make_cache_key(website_url, industry, region)
        data = client.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception:
        return None


def set_cached_analysis(
    website_url: str, industry: str, region: str,
    result: dict, ttl_seconds: int = 86400  # 24 hours
) -> bool:
    """Cache analysis result. Returns True on success."""
    client = _get_redis_client()
    if not client:
        return False
    try:
        key = _make_cache_key(website_url, industry, region)
        client.setex(key, ttl_seconds, json.dumps(result))
        return True
    except Exception:
        return False


def invalidate_cache(website_url: str, industry: str, region: str) -> bool:
    """Remove cached entry for given parameters."""
    client = _get_redis_client()
    if not client:
        return False
    try:
        key = _make_cache_key(website_url, industry, region)
        client.delete(key)
        return True
    except Exception:
        return False
