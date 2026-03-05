import pytest
from unittest.mock import AsyncMock, patch
from app.agents.competitor import discover_competitors, _is_valid_competitor


def test_is_valid_competitor_filters_google():
    assert _is_valid_competitor("https://www.google.com/search") is False

def test_is_valid_competitor_filters_youtube():
    assert _is_valid_competitor("https://youtube.com/watch?v=123") is False

def test_is_valid_competitor_accepts_valid_site():
    assert _is_valid_competitor("https://lawfirm-example.com") is True

def test_is_valid_competitor_accepts_korean_site():
    assert _is_valid_competitor("https://lawoffice.co.kr") is True

def test_is_valid_competitor_handles_malformed_url():
    # Should not raise, just return False
    assert _is_valid_competitor("not-a-url") is False or _is_valid_competitor("not-a-url") is True
    # Either outcome is fine, but it must not raise an exception


@pytest.mark.asyncio
async def test_discover_competitors_returns_list():
    with patch("app.agents.competitor.search_google", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = [
            "https://comp1.com",
            "https://comp2.com",
            "https://comp3.com",
            "https://google.com",  # should be filtered out
        ]
        result = await discover_competitors("법률 서비스", "서울", max_results=3)
        assert isinstance(result, list)
        assert len(result) <= 3
        assert not any("google.com" in url for url in result)


@pytest.mark.asyncio
async def test_discover_competitors_with_manual_input():
    with patch("app.agents.competitor.search_google", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = ["https://extra1.com", "https://extra2.com"]
        manual = ["https://manual1.com"]
        result = await discover_competitors("법률 서비스", "서울", manual_competitors=manual)
        assert "https://manual1.com" in result


@pytest.mark.asyncio
async def test_discover_competitors_no_duplicates():
    with patch("app.agents.competitor.search_google", new_callable=AsyncMock) as mock_search:
        # Same domain returned twice from different queries
        mock_search.return_value = [
            "https://comp1.com/page1",
            "https://comp1.com/page2",  # same domain
            "https://comp2.com",
        ]
        result = await discover_competitors("카페", "부산", max_results=10)
        domains = [urlparse(url).netloc for url in result]
        assert len(domains) == len(set(domains))  # no duplicate domains


def urlparse(url):
    from urllib.parse import urlparse as _urlparse
    return _urlparse(url)
