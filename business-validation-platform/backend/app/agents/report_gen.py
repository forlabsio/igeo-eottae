import anthropic
import json
from typing import List, Dict, Any, Optional
from app.config import settings

# ────────────────────────────────────────────────────────────
# STARTER (basic) — 6 섹션, 표준 맥킨지 보고서, min 2,000자
# ────────────────────────────────────────────────────────────
STARTER_SYSTEM_PROMPT = """당신은 맥킨지 전략 컨설턴트입니다. 제공된 데이터를 바탕으로 전문적인 비즈니스 검증 보고서를 작성하세요.

보고서 구조 (반드시 이 순서로):
1. # 비즈니스 검증 보고서 [Starter]
2. ## Executive Summary (핵심 결론 3~5가지, 검증 점수 XX/100)
3. ## 1. 시장 분석 (TAM/SAM/SOM 추정)
4. ## 2. 경쟁사 분석 (프로필 테이블, SWOT)
5. ## 3. 기술 감사 (SEO 건강도, 스키마)
6. ## 4. 고의도 키워드 Top 30 (테이블)
7. ## 5. 실행 로드맵 (즉시/단기/중기 액션)
8. ## 6. 예상 ROI

보고서 최소 2,000자 이상. 어조: 단호하고 구체적. 모든 주장에 근거 제시."""

# ────────────────────────────────────────────────────────────
# PRO — 8 섹션 + 투자자 메모 + 리스크 매트릭스 + 6개월 로드맵
# min 4,000자, claude haiku max_tokens=8096
# ────────────────────────────────────────────────────────────
PRO_SYSTEM_PROMPT = """당신은 골드만삭스 출신의 시니어 전략 컨설턴트입니다. 제공된 데이터를 바탕으로 투자자와 경영진을 설득할 수 있는 최고 수준의 비즈니스 검증 보고서를 작성하세요.

보고서 구조 (반드시 이 순서로):
1. # 비즈니스 검증 보고서 [Pro — 심층 분석]
2. ## Executive Summary (핵심 결론 5~7가지, 검증 점수 XX/100, 투자 추천 등급: Buy/Hold/Pass)
3. ## 1. 시장 분석 (TAM/SAM/SOM 정량 추정 + CAGR + 시장 성숙도 분석)
4. ## 2. 경쟁사 심층 분석 (포지셔닝 맵, 각 경쟁사 SWOT 테이블, 시장 점유율 추정)
5. ## 3. 기술 감사 (SEO 점수, Core Web Vitals 추정, 스키마 비교표, 개선 우선순위)
6. ## 4. 고의도 키워드 Top 50 (검색량·난이도·CPC·의도 분류 테이블)
7. ## 5. 콘텐츠 갭 & GBP 전략 (미충족 수요, GBP 게시물 빈도/유형/CTA)
8. ## 6. 리스크 매트릭스 (발생 가능성 × 영향도 매트릭스, 미티게이션 전략)
9. ## 7. 6개월 실행 로드맵 (주차별 액션, OKR, 담당 역할)
10. ## 8. 재무 시뮬레이션 (3가지 시나리오: 비관/기본/낙관, 손익분기점, 투자 회수 기간)

보고서 최소 4,000자 이상. 각 섹션에 구체적인 수치와 근거 포함. 투자자가 읽는 IR 수준의 전문성. "~할 수도 있습니다" 금지."""


async def generate_report(
    website_url: str,
    industry: str,
    region: str,
    competitors: List[Dict],
    seo_comparison: Dict,
    keywords: List[Dict],
    content_gaps: List[Dict],
    market_data: Dict,
    tier: str = "basic",
    business_plan_context: Optional[Dict] = None,
) -> str:
    """티어별 맥킨지/골드만삭스 스타일 보고서 생성"""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    is_pro = tier == "pro"
    system_prompt = PRO_SYSTEM_PROMPT if is_pro else STARTER_SYSTEM_PROMPT
    max_tokens = 8096 if is_pro else 4096
    min_chars = 4000 if is_pro else 2000
    keyword_display = 50 if is_pro else 30

    data_summary = {
        "website_url": website_url,
        "industry": industry,
        "region": region,
        "competitor_count": len(competitors),
        "competitors": competitors,
        "seo_analysis": seo_comparison,
        "top_keywords": keywords[:keyword_display],
        "content_gaps": content_gaps,
        "market_data": market_data,
    }

    # Build business plan section if provided
    bp_section = ""
    if business_plan_context:
        swot = business_plan_context.get("swot", {})
        completeness = business_plan_context.get("completeness_score", "N/A")
        market_validity = business_plan_context.get("market_validity", {})
        execution = business_plan_context.get("execution_feasibility", {})

        if is_pro:
            bp_section = f"""

**[Pro] 사업계획서 AI 심층 분석:**
- 완성도 점수: {completeness}/100
- 시장 타당성 점수: {market_validity.get('score', 'N/A')}/100
- 실행 가능성 점수: {execution.get('score', 'N/A')}/100
- SWOT 강점: {', '.join(swot.get('strengths', []))}
- SWOT 약점: {', '.join(swot.get('weaknesses', []))}
- SWOT 기회: {', '.join(swot.get('opportunities', []))}
- SWOT 위협: {', '.join(swot.get('threats', []))}
- 핵심 리스크: {', '.join(market_validity.get('key_risks', []))}
- 핵심 기회: {', '.join(market_validity.get('key_opportunities', []))}
- 실행 권고사항: {', '.join(execution.get('recommendations', []))}
- 실행 Critical Gaps: {', '.join(execution.get('critical_gaps', []))}

이 사업계획서 분석 결과를 보고서 전반에 통합하고, 별도 ## 9. 사업계획서 종합 평가 섹션을 추가하세요."""
        else:
            bp_section = f"""

**사업계획서 AI 분석:**
- 완성도 점수: {completeness}/100
- 시장 타당성: {market_validity.get('score', 'N/A')}/100
- 실행 가능성: {execution.get('score', 'N/A')}/100
- 강점: {', '.join(swot.get('strengths', [])[:3])}
- 약점: {', '.join(swot.get('weaknesses', [])[:3])}
- 권고사항: {', '.join(execution.get('recommendations', [])[:3])}

이 결과를 보고서에 통합하고 ## 7. 사업계획서 분석 섹션을 추가하세요."""

    tier_label = "Pro — 심층 분석 (20개 경쟁사 · 50개 키워드 · 8섹션)" if is_pro else "Starter (10개 경쟁사 · 30개 키워드 · 6섹션)"

    user_message = f"""다음 비즈니스에 대한 전략 보고서를 작성하세요. 분석 등급: {tier_label}

**분석 대상:**
- 웹사이트: {website_url}
- 업종: {industry}
- 지역: {region}

**수집된 데이터:**
```json
{json.dumps(data_summary, ensure_ascii=False, indent=2)}
```{bp_section}

위 데이터를 바탕으로 완전한 보고서를 Markdown 형식으로 작성하세요.
보고서는 최소 {min_chars:,}자 이상이어야 하며, 모든 섹션을 포함해야 합니다."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    return message.content[0].text
