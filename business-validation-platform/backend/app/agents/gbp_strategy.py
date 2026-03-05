import anthropic
import json
from typing import List, Dict, Any
from app.config import settings


async def generate_gbp_strategy(
    industry: str,
    region: str,
    competitors: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Generate Google Business Profile posting strategy using Claude Haiku"""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    competitor_list = "\n".join(
        f"- {c.get('url', 'unknown')}" for c in competitors[:5]
    )

    prompt = f"""당신은 로컬 SEO 전문가입니다. 다음 업종의 Google Business Profile 전략을 수립하세요.

**업종:** {industry}
**지역:** {region}
**분석된 경쟁사:**
{competitor_list}

다음 JSON 형식으로 응답하세요:
{{
  "posting_frequency": "주 N회 (요일 목록)",
  "content_mix": {{
    "tips": 50,
    "promotions": 30,
    "cases": 20
  }},
  "best_times": ["화요일 오전 9시", "금요일 오후 3시"],
  "cta_style": "추천 CTA 문구",
  "templates": [
    {{
      "type": "팁",
      "title": "게시물 제목",
      "body": "게시물 본문 (100자 내외)",
      "cta": "CTA 문구"
    }}
  ]
}}

templates는 반드시 10개 작성. JSON만 반환, 다른 텍스트 없음."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Extract JSON if wrapped in markdown code blocks
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Return structured fallback
        return {
            "posting_frequency": f"주 5회",
            "content_mix": {"tips": 50, "promotions": 30, "cases": 20},
            "best_times": ["화요일 오전 9시", "금요일 오후 3시"],
            "cta_style": "무료 견적 받기",
            "templates": [
                {
                    "type": "팁",
                    "title": f"{industry} 선택 시 확인할 5가지",
                    "body": f"{region}에서 {industry}를 찾으신다면? 전문가가 알려드립니다.",
                    "cta": "📞 무료 상담: [전화번호]"
                }
            ] * 10,
        }
