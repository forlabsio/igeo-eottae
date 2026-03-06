import anthropic
import json
from typing import List, Dict, Any, Optional
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
    business_plan_context: Optional[Dict] = None,
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

    # Build business plan section if provided
    bp_section = ""
    if business_plan_context:
        swot = business_plan_context.get("swot", {})
        completeness = business_plan_context.get("completeness_score", "N/A")
        market_validity = business_plan_context.get("market_validity", {})
        execution = business_plan_context.get("execution_feasibility", {})

        bp_section = f"""

**사업계획서 AI 분석 결과:**
- 완성도 점수: {completeness}/100
- 시장 타당성 점수: {market_validity.get('score', 'N/A')}/100
- 실행 가능성 점수: {execution.get('score', 'N/A')}/100
- SWOT 강점: {', '.join(swot.get('strengths', [])[:3])}
- SWOT 약점: {', '.join(swot.get('weaknesses', [])[:3])}
- 핵심 리스크: {', '.join(market_validity.get('key_risks', [])[:2])}
- 실행 권고사항: {', '.join(execution.get('recommendations', [])[:3])}

이 사업계획서 분석 결과를 보고서에 반드시 통합하여 제시하세요. ## 7. 사업계획서 분석 섹션을 보고서 끝에 추가하세요."""

    user_message = f"""다음 비즈니스에 대한 맥킨지 스타일 검증 보고서를 작성하세요.

**분석 대상:**
- 웹사이트: {website_url}
- 업종: {industry}
- 지역: {region}

**수집된 데이터:**
```json
{json.dumps(data_summary, ensure_ascii=False, indent=2)}
```{bp_section}

위 데이터를 바탕으로 완전한 비즈니스 검증 보고서를 Markdown 형식으로 작성하세요.
보고서는 최소 1,500자 이상이어야 하며, 모든 섹션을 포함해야 합니다."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8096,
        system=REPORT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return message.content[0].text
