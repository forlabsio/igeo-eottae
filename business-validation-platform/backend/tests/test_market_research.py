import pytest
from unittest.mock import MagicMock, patch
from app.agents.market_research import estimate_market_size


@pytest.mark.asyncio
async def test_estimate_market_size_returns_dict():
    mock_response = '{"tam": {"size": "₩500억", "description": "전체"}, "sam": {"size": "₩50억", "description": "도달가능"}, "som": {"size": "₩5억", "description": "목표"}, "growth_rate": "연 10%", "key_trends": ["트렌드1"], "competition_level": "중", "entry_barrier": "보통"}'
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text=mock_response)]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.market_research.anthropic.Anthropic", return_value=mock_client):
        result = await estimate_market_size("법률 서비스", "서울")

    assert "tam" in result
    assert "sam" in result
    assert "som" in result
    assert "competition_level" in result


@pytest.mark.asyncio
async def test_estimate_market_size_handles_invalid_json():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="잘못된 응답")]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.market_research.anthropic.Anthropic", return_value=mock_client):
        result = await estimate_market_size("카페", "부산")

    assert isinstance(result, dict)
    assert "tam" in result
