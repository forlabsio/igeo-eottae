import pytest
from unittest.mock import MagicMock, patch
from app.agents.gbp_strategy import generate_gbp_strategy


@pytest.mark.asyncio
async def test_generate_gbp_strategy_returns_dict():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text='{"posting_frequency": "주 5회", "content_mix": {"tips": 50, "promotions": 30, "cases": 20}, "best_times": ["화요일 오전 9시"], "cta_style": "무료 견적", "templates": [{"type": "팁", "title": "제목", "body": "본문", "cta": "CTA"}]}')]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.gbp_strategy.anthropic.Anthropic", return_value=mock_client):
        result = await generate_gbp_strategy("법률 서비스", "서울", [])

    assert isinstance(result, dict)
    assert "posting_frequency" in result
    assert "templates" in result


@pytest.mark.asyncio
async def test_generate_gbp_strategy_handles_invalid_json():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="이것은 JSON이 아닙니다")]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.gbp_strategy.anthropic.Anthropic", return_value=mock_client):
        result = await generate_gbp_strategy("카페", "부산", [])

    # Should return fallback, not raise
    assert isinstance(result, dict)
    assert "posting_frequency" in result
    assert "templates" in result
