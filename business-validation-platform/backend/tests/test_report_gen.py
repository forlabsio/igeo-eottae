import pytest
from unittest.mock import MagicMock, patch
from app.agents.report_gen import generate_report, STARTER_SYSTEM, PRO_SYSTEM


@pytest.mark.asyncio
async def test_generate_report_returns_markdown_string():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="# 비즈니스 검증 보고서\n\n## Executive Summary\n\n테스트 내용입니다.")]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.report_gen.anthropic.Anthropic", return_value=mock_client):
        result = await generate_report(
            website_url="https://example.com",
            industry="법률 서비스",
            region="서울",
            competitors=[{"url": "https://comp.com"}],
            seo_comparison={"missing_schemas": ["FAQ"], "recommendations": []},
            keywords=[{"keyword": "법률 near me", "intent": "transactional"}],
            content_gaps=[],
            market_data={"industry": "법률"},
        )
    assert isinstance(result, str)
    assert "Executive Summary" in result


@pytest.mark.asyncio
async def test_generate_report_calls_correct_model():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="# Report")]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.report_gen.anthropic.Anthropic", return_value=mock_client):
        await generate_report(
            website_url="https://example.com",
            industry="카페",
            region="부산",
            competitors=[],
            seo_comparison={},
            keywords=[],
            content_gaps=[],
            market_data={},
        )

    call_kwargs = mock_client.messages.create.call_args
    assert call_kwargs.kwargs["model"] == "claude-haiku-4-5-20251001"
    assert call_kwargs.kwargs["max_tokens"] == 4096


@pytest.mark.asyncio
async def test_generate_report_includes_website_url_in_prompt():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="# Report\nsome content")]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.agents.report_gen.anthropic.Anthropic", return_value=mock_client):
        await generate_report(
            website_url="https://my-special-site.com",
            industry="치과",
            region="강남",
            competitors=[],
            seo_comparison={},
            keywords=[],
            content_gaps=[],
            market_data={},
        )

    call_kwargs = mock_client.messages.create.call_args
    user_content = call_kwargs.kwargs["messages"][0]["content"]
    assert "my-special-site.com" in user_content


def test_system_prompt_contains_key_sections():
    assert "Executive Summary" in STARTER_SYSTEM
    assert "McKinsey" in STARTER_SYSTEM
    assert "실행 로드맵" in STARTER_SYSTEM
    assert "Executive Summary" in PRO_SYSTEM
    assert "Goldman Sachs" in PRO_SYSTEM
