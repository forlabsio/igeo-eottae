import pytest
from unittest.mock import patch, MagicMock
from app.utils.cache import _make_cache_key, get_cached_analysis, set_cached_analysis, invalidate_cache
import json


def test_make_cache_key_is_deterministic():
    key1 = _make_cache_key("https://example.com", "법률", "서울")
    key2 = _make_cache_key("https://example.com", "법률", "서울")
    assert key1 == key2


def test_make_cache_key_is_different_for_different_inputs():
    key1 = _make_cache_key("https://example.com", "법률", "서울")
    key2 = _make_cache_key("https://example.com", "의료", "서울")
    assert key1 != key2


def test_make_cache_key_normalizes_url():
    key1 = _make_cache_key("https://EXAMPLE.COM", "법률", "서울")
    key2 = _make_cache_key("https://example.com", "법률", "서울")
    assert key1 == key2


def test_get_cached_analysis_returns_none_when_redis_unavailable():
    with patch("app.utils.cache._get_redis_client", return_value=None):
        result = get_cached_analysis("https://example.com", "법률", "서울")
        assert result is None


def test_get_cached_analysis_returns_cached_data():
    mock_redis = MagicMock()
    mock_redis.get.return_value = json.dumps({"competitors": ["a", "b"]})
    with patch("app.utils.cache._get_redis_client", return_value=mock_redis):
        result = get_cached_analysis("https://example.com", "법률", "서울")
        assert result == {"competitors": ["a", "b"]}


def test_set_cached_analysis_returns_false_when_redis_unavailable():
    with patch("app.utils.cache._get_redis_client", return_value=None):
        result = set_cached_analysis("https://example.com", "법률", "서울", {"data": "test"})
        assert result is False


def test_set_cached_analysis_calls_setex():
    mock_redis = MagicMock()
    with patch("app.utils.cache._get_redis_client", return_value=mock_redis):
        result = set_cached_analysis("https://example.com", "법률", "서울", {"data": "test"})
        assert result is True
        mock_redis.setex.assert_called_once()


def test_invalidate_cache_returns_false_when_redis_unavailable():
    with patch("app.utils.cache._get_redis_client", return_value=None):
        result = invalidate_cache("https://example.com", "법률", "서울")
        assert result is False
