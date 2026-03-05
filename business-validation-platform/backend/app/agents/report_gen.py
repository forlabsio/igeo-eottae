import anthropic
import json
from typing import List, Dict, Any
from app.config import settings

REPORT_SYSTEM_PROMPT = """당신은 맥킨지 전략 컨설턴트입니다. 제공된 데이터를 바탕으로 전문적인 비즈니스 검증 보고서를 작성하세요.

보고서 구조 (반드시 이 순서로):
1. # 비즈니스 검증 보고서 (제목)
2. ## Executive Summary (핵심 결론 3~5가지, 검증 점수 XX/100)
3. ## 1. 시장 분석 (TAM/SAM/SOM 추정)
4. ## 2. 경쟁사 분석 (프로필 테이블, SWOT)
5. ## 3. 기술 감사 (스키마 비교, SEO 건강도)
6. ## 4. 고의도 키워드 Top 20 (테이블)
7. ## 5. 실행 로드맵 (즉시/단기/중기)
8. ## 6. 예상 ROI

어조: 단호하고 구체적. 모든 주장에 근거 제시. "~할 수도 있습니다" 대신 "~하세요"."""


async def generate_report(
    website_url: str,
    industry: str,
    region: str,
    competitors: List[Dict],
    seo_comparison: Dict,
    keywords: List[Dict],
    content_gaps: List[Dict],
    market_data: Dict,
) -> str:
    """Claude Haiku로 맥킨지 스타일 보고서 생성"""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    data_summary = {
        "website_url": website_url,
        "industry": industry,
        "region": region,
        "competitor_count": len(competitors),
        "competitors": competitors[:10],
        "seo_analysis": seo_comparison,
        "top_keywords": keywords[:20],
        "content_gaps": content_gaps[:10],
        "market_data": market_data,
    }

    user_message = f"""다음 비즈니스에 대한 맥킨지 스타일 검증 보고서를 작성하세요.

**분석 대상:**
- 웹사이트: {website_url}
- 업종: {industry}
- 지역: {region}

**수집된 데이터:**
```json
{json.dumps(data_summary, ensure_ascii=False, indent=2)}
```

위 데이터를 바탕으로 완전한 비즈니스 검증 보고서를 Markdown 형식으로 작성하세요.
보고서는 최소 1,500자 이상이어야 하며, 모든 섹션을 포함해야 합니다."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8096,
        system=REPORT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return message.content[0].text
