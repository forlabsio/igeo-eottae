"""AI-powered business plan analyzer using Claude Haiku."""
import json
import re
import os
from typing import Dict


SYSTEM_PROMPT = """당신은 사업계획서 분석 전문가입니다. 사용자가 제공한 사업계획서 텍스트를 분석하여 반드시 아래 JSON 형식으로만 응답하세요. 추가 설명이나 마크다운 코드펜스 없이 순수 JSON만 출력하세요.

{
  "swot": {
    "strengths": ["강점1", "강점2", "강점3"],
    "weaknesses": ["약점1", "약점2", "약점3"],
    "opportunities": ["기회1", "기회2", "기회3"],
    "threats": ["위협1", "위협2", "위협3"]
  },
  "market_validity": {
    "score": 75,
    "summary": "시장 타당성 요약 (2-3문장)",
    "key_risks": ["리스크1", "리스크2"],
    "key_opportunities": ["기회1", "기회2"]
  },
  "completeness_score": 72,
  "completeness_breakdown": {
    "problem_definition": 80,
    "solution_clarity": 75,
    "market_analysis": 70,
    "business_model": 65,
    "execution_plan": 60
  },
  "execution_feasibility": {
    "score": 68,
    "summary": "실행 가능성 요약 (2-3문장)",
    "critical_gaps": ["부족한 부분1", "부족한 부분2"],
    "recommendations": ["권고사항1", "권고사항2", "권고사항3"]
  }
}

각 항목 점수는 0-100 정수입니다. completeness_score는 completeness_breakdown 평균입니다."""


async def analyze_business_plan(
    extracted_text: str,
    industry: str = "",
    region: str = "",
) -> Dict:
    """Analyze a business plan text and return structured JSON.

    Args:
        extracted_text: Plain text extracted from the uploaded document
        industry: Industry hint for context-aware analysis
        region: Target region hint

    Returns:
        dict with swot, market_validity, completeness_score, execution_feasibility

    Raises:
        ValueError: If Claude returns invalid JSON
    """
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=api_key)

    context_hint = ""
    if industry:
        context_hint += f"\n분석 산업: {industry}"
    if region:
        context_hint += f"\n목표 지역: {region}"

    user_message = f"""다음 사업계획서를 분석해 주세요.{context_hint}

--- 사업계획서 시작 ---
{extracted_text[:40000]}
--- 사업계획서 끝 ---"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown code fences if present
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)
    raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude가 유효한 JSON을 반환하지 않았습니다: {e}\n원본: {raw_text[:200]}")