"""Tests for business_plan_analyzer."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_analyze_returns_dict():
    """Mock Claude call and verify JSON parsing works."""
    mock_response = {
        "swot": {
            "strengths": ["강점1"],
            "weaknesses": ["약점1"],
            "opportunities": ["기회1"],
            "threats": ["위협1"],
        },
        "market_validity": {"score": 70, "summary": "시장 유효", "key_risks": [], "key_opportunities": []},
        "completeness_score": 75,
        "completeness_breakdown": {
            "problem_definition": 80,
            "solution_clarity": 75,
            "market_analysis": 70,
            "business_model": 75,
            "execution_plan": 75,
        },
        "execution_feasibility": {"score": 72, "summary": "실행 가능", "critical_gaps": [], "recommendations": []},
    }

    mock_content = MagicMock()
    mock_content.text = json.dumps(mock_response)
    mock_message = MagicMock()
    mock_message.content = [mock_content]

    with patch("anthropic.Anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        from app.agents.business_plan_analyzer import analyze_business_plan
        result = await analyze_business_plan("사업계획서 내용입니다", industry="IT", region="서울")

    assert result["completeness_score"] == 75
    assert "swot" in result
    assert "execution_feasibility" in result


@pytest.mark.asyncio
async def test_strips_code_fences():
    """Verify markdown code fences are stripped before JSON parsing."""
    mock_content = MagicMock()
    mock_content.text = '```json\n{"completeness_score": 80, "swot": {}, "market_validity": {}, "execution_feasibility": {}}\n```'
    mock_message = MagicMock()
    mock_message.content = [mock_content]

    with patch("anthropic.Anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        from app.agents.business_plan_analyzer import analyze_business_plan
        result = await analyze_business_plan("테스트")

    assert result["completeness_score"] == 80


@pytest.mark.asyncio
async def test_invalid_json_raises():
    """Verify ValueError on non-JSON response."""
    mock_content = MagicMock()
    mock_content.text = "이것은 JSON이 아닙니다"
    mock_message = MagicMock()
    mock_message.content = [mock_content]

    with patch("anthropic.Anthropic") as mock_anthropic:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        from app.agents.business_plan_analyzer import analyze_business_plan
        with pytest.raises(ValueError, match="유효한 JSON"):
            await analyze_business_plan("테스트")