import pytest
from unittest.mock import AsyncMock, patch
from app.agents.gap_analysis import analyze_content_gap, _extract_topics_from_content


def test_extract_topics_returns_list():
    content = {
        "title": "최고의 법률 서비스",
        "headings": [
            {"tag": "H1", "text": "무료 상담"},
            {"tag": "H2", "text": "서비스 가격"},
            {"tag": "H3", "text": ""},  # empty - should be filtered
        ],
    }
    result = _extract_topics_from_content(content)
    assert isinstance(result, list)
    assert len(result) >= 2
    assert any("가격" in t for t in result)


def test_extract_topics_handles_empty_content():
    result = _extract_topics_from_content({})
    assert result == []


@pytest.mark.asyncio
async def test_analyze_content_gap_returns_list():
    mock_our = {
        "title": "우리 회사", "headings": [{"tag": "H1", "text": "법률 상담"}], "html": "", "meta": {}
    }
    mock_comp = {
        "title": "경쟁사", "headings": [
            {"tag": "H1", "text": "법률 상담"},
            {"tag": "H2", "text": "법률 비용 안내"},
            {"tag": "H2", "text": "판례 검색"},
        ], "html": "", "meta": {}
    }
    with patch("app.agents.gap_analysis.fetch_page_content", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = [mock_our, mock_comp]
        result = await analyze_content_gap("https://us.com", ["https://comp.com"])
        assert isinstance(result, list)
        # Gap topics should be found
        topics = [g["topic"] for g in result]
        assert any("비용" in t for t in topics)


@pytest.mark.asyncio
async def test_analyze_content_gap_handles_fetch_failure():
    with patch("app.agents.gap_analysis.fetch_page_content", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = None
        result = await analyze_content_gap("https://us.com", ["https://comp.com"])
        assert isinstance(result, list)
        assert result == []
