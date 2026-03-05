import anthropic
import json
from typing import Dict, Any
from app.config import settings


async def estimate_market_size(
    industry: str,
    region: str,
) -> Dict[str, Any]:
    """Estimate TAM/SAM/SOM using Claude Haiku"""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""당신은 시장 분석 전문가입니다. 다음 업종의 시장 규모를 추정하세요.

**업종:** {industry}
**지역:** {region}

다음 JSON 형식으로 응답하세요:
{{
  "tam": {{
    "size": "₩500억",
    "description": "전체 시장 규모 설명 (한국 전체 또는 해당 업종 전체)"
  }},
  "sam": {{
    "size": "₩50억",
    "description": "도달 가능한 시장 (온라인 기반, 해당 지역)"
  }},
  "som": {{
    "size": "₩5억",
    "description": "현실적 목표 시장 (초기 1-2년)"
  }},
  "growth_rate": "연 X% 성장",
  "key_trends": ["트렌드1", "트렌드2", "트렌드3"],
  "competition_level": "상/중/하",
  "entry_barrier": "낮음/보통/높음"
}}

JSON만 반환. 근거 있는 수치 사용."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "tam": {"size": "추정 불가", "description": "데이터 부족"},
            "sam": {"size": "추정 불가", "description": "데이터 부족"},
            "som": {"size": "추정 불가", "description": "데이터 부족"},
            "growth_rate": "미확인",
            "key_trends": [],
            "competition_level": "중",
            "entry_barrier": "보통",
        }
