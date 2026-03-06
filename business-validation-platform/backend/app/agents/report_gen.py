import anthropic
import re
from typing import List, Dict, Any, Optional
from app.config import settings

# ────────────────────────────────────────────────────────────
# STRICT RULES — injected into every prompt
# ────────────────────────────────────────────────────────────
STRICT_RULES = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작성 철칙 (위반 시 보고서 자동 반려)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① 모든 수치 근거 필수 — "높다/낮다" 금지. 반드시 "월 검색량 4,500회", "DA 45/100" 형태로.
② 일반론 절대 금지 — "마케팅이 필요합니다" → "Google Ads '[키워드]'에 월 ₩50만 투자 → 예상 클릭 1,200회"
③ 테이블 최소 5개 — 경쟁사 비교표·키워드표·재무표·로드맵·리스크표 필수 포함.
④ 구체적 숫자 20개 이상 — 매출·비용·트래픽·검색량 등 실수치.
⑤ 강약 단정 어조 — "~할 수 있습니다" 금지. "~하세요", "~입니다" 사용.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# ────────────────────────────────────────────────────────────
# STARTER — 6 sections, min 2,000자
# ────────────────────────────────────────────────────────────
STARTER_SYSTEM = f"""당신은 McKinsey & Company 시니어 파트너입니다.
제공된 실제 수집 데이터를 분석하여 클라이언트 전략 보고서를 작성합니다.
{STRICT_RULES}
보고서 구조 (반드시 이 순서와 헤더 사용):

# 비즈니스 검증 보고서 [Starter]

## Executive Summary
(검증 점수 XX/100, 세부항목 포함, 핵심 발견 5가지)

## 1. 시장 분석
(TAM / SAM / SOM 추정 + 성장 동력 + 시장 기회)

## 2. 경쟁사 분석
(상위 10개 비교 테이블 + 포지셔닝 + SWOT)

## 3. SEO 기술 감사
(점수 비교표 + 스키마 현황 + 개선 우선순위)

## 4. 고의도 키워드 Top 30
(키워드·의도·CPC 추정·우선순위 테이블)

## 5. 6개월 실행 로드맵
(월별 주요 액션 + 예상 효과 + 담당)

## 6. 재무 예측
(3시나리오 비교표: 보수적·현실적·낙관적 + CAC/LTV + 손익분기점)
"""

# ────────────────────────────────────────────────────────────
# PRO — 8 sections + investor memo + risk matrix, min 4,000자
# ────────────────────────────────────────────────────────────
PRO_SYSTEM = f"""당신은 Goldman Sachs 출신 McKinsey 시니어 파트너입니다.
투자자와 이사회를 설득하는 IR급 전략 보고서를 작성합니다.
{STRICT_RULES}
보고서 구조 (반드시 이 순서와 헤더 사용):

# 비즈니스 검증 보고서 [Pro — 심층 분석]

## Executive Summary
(검증 점수 XX/100 | 투자 등급: Buy/Hold/Pass | 핵심 발견 7가지)

## 1. 시장 분석
(TAM/SAM/SOM 정량 + CAGR + 시장 성숙도 + 진입 타이밍)

## 2. 경쟁사 심층 분석
(상위 20개 비교 테이블 + 포지셔닝 맵 + 각사 SWOT + 위협도 순위)

## 3. SEO 기술 감사
(경쟁사 벤치마크 비교표 + Core Web Vitals 추정 + 스키마 분석 + 개선 우선순위)

## 4. 고의도 키워드 Top 50
(키워드·의도·검색량 추정·CPC·난이도·ROI 테이블)

## 5. 콘텐츠 갭 & GBP 전략
(미충족 수요 분석 + GBP 게시물 전략 + 콘텐츠 캘린더)

## 6. 리스크 매트릭스
(발생 가능성 × 영향도 매트릭스 + 미티게이션 전략)

## 7. 6개월 실행 로드맵
(주차별 액션 + OKR + 담당 역할 + 예산 배분)

## 8. 재무 시뮬레이션
(3시나리오 월별 시뮬레이션 + CAC/LTV/BEP + 투자 회수 기간)
"""


# ────────────────────────────────────────────────────────────
# Data Formatting Helpers
# ────────────────────────────────────────────────────────────

def _fmt_competitors(competitors: List[Dict]) -> str:
    if not competitors:
        return "_경쟁사 데이터 수집 중_\n"
    rows = [
        "| # | URL | 스키마 수 | 스키마 유형 |",
        "|---|-----|----------|-----------|",
    ]
    for i, c in enumerate(competitors[:20], 1):
        url = c.get("url", "N/A")
        audit = c.get("audit", {}) or {}
        schema_count = audit.get("schema_count", 0)
        schema_types = ", ".join(str(t) for t in audit.get("schema_types", [])[:3]) or "없음"
        rows.append(f"| {i} | {url} | {schema_count}개 | {schema_types} |")
    return "\n".join(rows)


def _fmt_keywords(keywords: List[Dict], limit: int = 30) -> str:
    if not keywords:
        return "_키워드 데이터 없음_\n"
    rows = [
        "| # | 키워드 | 의도 유형 | 패턴 분류 |",
        "|---|--------|----------|---------|",
    ]
    for i, kw in enumerate(keywords[:limit], 1):
        keyword = kw.get("keyword", "")
        intent = kw.get("intent", "")
        pattern = kw.get("pattern_type", "")
        rows.append(f"| {i} | {keyword} | {intent} | {pattern} |")
    return "\n".join(rows)


def _fmt_gaps(gaps: List[Dict]) -> str:
    if not gaps:
        return "_콘텐츠 갭 데이터 없음_\n"
    rows = [
        "| 주제/키워드 | 경쟁사 | 우선순위 |",
        "|------------|-------|---------|",
    ]
    for g in gaps[:20]:
        topic = g.get("topic", g.get("keyword", "N/A"))
        comp = g.get("competitor_url", g.get("source", "경쟁사 보유"))
        pri = g.get("priority", "중")
        rows.append(f"| {topic} | {comp} | {pri} |")
    return "\n".join(rows)


def _fmt_market(market: Dict) -> str:
    if not market:
        return "_시장 데이터 없음_\n"
    lines = []
    for k, v in market.items():
        if isinstance(v, dict):
            lines.append(f"**{k}:**")
            for sk, sv in v.items():
                lines.append(f"  - {sk}: {sv}")
        else:
            lines.append(f"**{k}:** {v}")
    return "\n".join(lines)


def _fmt_financial(financial: Optional[Dict]) -> str:
    if not financial:
        return ""

    lines = ["\n### 재무 시나리오 데이터 (3가지)\n"]
    headers = ["| 시나리오 | 월 성장률 | CAC | 전환율 | 이탈률 | ARPU |",
               "|---------|---------|-----|-------|-------|------|"]
    rows = list(headers)

    scenario_labels = {
        "conservative": "보수적 (Conservative)",
        "realistic": "현실적 (Realistic)",
        "optimistic": "낙관적 (Optimistic)",
    }

    yr_headers = ["| 시나리오 | 1년차 누적 매출 | 2년차 누적 매출 | 3년차 누적 매출 | 손익분기 | LTV |",
                  "|---------|-------------|-------------|-------------|---------|-----|"]
    yr_rows = list(yr_headers)

    for key, label in scenario_labels.items():
        s = financial.get(key, {})
        assumptions = s.get("assumptions", {})
        yearly = s.get("yearly", [])
        bep = s.get("bep_month")
        ltv = s.get("ltv", 0)

        growth = f"{assumptions.get('monthly_growth_rate', 0) * 100:.0f}%/월"
        cac = f"₩{int(assumptions.get('cac', 0)):,}"
        conv = f"{assumptions.get('conversion_rate', 0) * 100:.1f}%"
        churn = f"{assumptions.get('churn_rate', 0) * 100:.1f}%/월"
        arpu = f"₩{int(assumptions.get('arpu', 0)):,}"
        rows.append(f"| {label} | {growth} | {cac} | {conv} | {churn} | {arpu} |")

        rev_vals = []
        for yr_data in yearly[:3]:
            rev_vals.append(f"₩{int(yr_data.get('total_revenue', 0)) / 1_000_000:.1f}M")
        while len(rev_vals) < 3:
            rev_vals.append("N/A")
        bep_str = f"{bep}개월" if bep else "36개월 이상"
        ltv_str = f"₩{ltv:,}" if ltv else "N/A"
        yr_rows.append(f"| {label} | {rev_vals[0]} | {rev_vals[1]} | {rev_vals[2]} | {bep_str} | {ltv_str} |")

    lines.extend(rows)
    lines.append("")
    lines.extend(yr_rows)
    return "\n".join(lines)


def _fmt_business_plan(bp: Optional[Dict]) -> str:
    if not bp:
        return ""
    swot = bp.get("swot", {})
    completeness = bp.get("completeness_score", "N/A")
    market_validity = bp.get("market_validity", {}) or {}
    execution = bp.get("execution_feasibility", {}) or {}

    return f"""
---

### 📋 사업계획서 AI 분석 결과

| 항목 | 점수 | 주요 리스크 |
|------|------|-----------|
| 완성도 | {completeness}/100 | — |
| 시장 타당성 | {market_validity.get('score', 'N/A')}/100 | {', '.join(str(r) for r in market_validity.get('key_risks', [])[:2])} |
| 실행 가능성 | {execution.get('score', 'N/A')}/100 | {', '.join(str(g) for g in execution.get('critical_gaps', [])[:2])} |

**SWOT 요약:**
- 강점: {', '.join(str(s) for s in swot.get('strengths', [])[:3])}
- 약점: {', '.join(str(w) for w in swot.get('weaknesses', [])[:3])}
- 기회: {', '.join(str(o) for o in swot.get('opportunities', [])[:3])}
- 위협: {', '.join(str(t) for t in swot.get('threats', [])[:3])}

**핵심 권고사항:** {', '.join(str(r) for r in execution.get('recommendations', [])[:3])}
"""


def _build_message(
    website_url: str,
    industry: str,
    region: str,
    competitors: List[Dict],
    seo_comparison: Dict,
    keywords: List[Dict],
    content_gaps: List[Dict],
    market_data: Dict,
    tier: str,
    financial_model: Optional[Dict] = None,
    business_plan_context: Optional[Dict] = None,
) -> str:
    is_pro = tier == "pro"
    keyword_limit = 50 if is_pro else 30
    min_chars = 4000 if is_pro else 2000
    tier_label = "Pro — 심층 분석 (20개 경쟁사 · 50개 키워드 · 8섹션)" if is_pro else "Starter (10개 경쟁사 · 30개 키워드 · 6섹션)"

    comp_table = _fmt_competitors(competitors)
    kw_table = _fmt_keywords(keywords, keyword_limit)
    gap_table = _fmt_gaps(content_gaps)
    market_text = _fmt_market(market_data)
    financial_text = _fmt_financial(financial_model)
    bp_text = _fmt_business_plan(business_plan_context)

    seo_score = seo_comparison.get("our_schema_count", 0)
    seo_avg = seo_comparison.get("avg_competitor_schema_count", 0)
    recs = seo_comparison.get("recommendations", [])
    seo_recs = "\n".join(f"  - {r}" for r in recs[:6]) if recs else "  - 스키마 마크업 추가 필요"

    return f"""분석 등급: **{tier_label}**

---

## 📊 수집된 실제 데이터

### 분석 대상
- 웹사이트: {website_url}
- 업종: {industry}
- 지역: {region}

### 시장 데이터
{market_text}

### 경쟁사 목록 ({len(competitors)}개 수집)
{comp_table}

### SEO 기술 감사
- 자사 스키마 마크업: **{seo_score}개**
- 경쟁사 평균 스키마: **{seo_avg:.1f}개**
- 주요 개선 권고사항:
{seo_recs}

### 고의도 키워드 Top {keyword_limit}
{kw_table}

### 콘텐츠 갭 분석
{gap_table}
{financial_text}
{bp_text}

---

## 작성 지시사항

위 **실제 수집된 데이터**를 반드시 사용하여 보고서를 작성하세요.
- 최소 **{min_chars:,}자** 이상
- 위 데이터의 URL, 수치, 키워드를 그대로 인용할 것
- 구체적 수치 없는 문장은 절대 작성 금지
- 각 섹션에 **테이블 포함 필수** (경쟁사 비교, 키워드, 재무, 로드맵, 리스크)
- Executive Summary에 **검증 점수 세부 항목별** 점수 포함
- 로드맵은 **월별/주별 구체적 액션**으로 작성
- 재무 예측은 **보수적/현실적/낙관적 3가지 시나리오** 비교표로 작성
- 경쟁사 분석에서 각 사이트의 **실제 URL과 스키마 데이터** 인용"""


# ────────────────────────────────────────────────────────────
# Report Validator
# ────────────────────────────────────────────────────────────

def _validate(text: str, min_chars: int) -> List[str]:
    """Returns list of quality issues (empty list = pass)."""
    issues = []

    if len(text) < min_chars:
        issues.append(f"보고서 길이 부족: {len(text):,}자 (최소 {min_chars:,}자 필요)")

    number_count = len(re.findall(r'\d[\d,.]*', text))
    if number_count < 10:
        issues.append(f"구체적 수치 부족: {number_count}개 (최소 10개 필요)")

    table_count = len(re.findall(r'\|[-:]+\|', text))
    if table_count < 3:
        issues.append(f"테이블 부족: {table_count}개 (최소 3개 필요)")

    generic_phrases = [
        "마케팅이 필요합니다",
        "경쟁이 심합니다",
        "차별화가 중요합니다",
        "시장 조사가 필요합니다",
    ]
    for phrase in generic_phrases:
        if phrase in text:
            issues.append(f"일반론 감지: '{phrase}' → 구체적 수치/액션으로 대체 필요")

    if "Executive Summary" not in text and "executive summary" not in text.lower():
        issues.append("Executive Summary 섹션 누락")

    return issues


# ────────────────────────────────────────────────────────────
# Main Report Generator
# ────────────────────────────────────────────────────────────

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
    financial_model: Optional[Dict] = None,
    business_plan_context: Optional[Dict] = None,
) -> str:
    """McKinsey/Goldman Sachs 스타일 보고서 생성 with auto-validation retry."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    is_pro = tier == "pro"
    system_prompt = PRO_SYSTEM if is_pro else STARTER_SYSTEM
    max_tokens = 8096 if is_pro else 4096
    min_chars = 4000 if is_pro else 2000

    user_message = _build_message(
        website_url=website_url,
        industry=industry,
        region=region,
        competitors=competitors,
        seo_comparison=seo_comparison,
        keywords=keywords,
        content_gaps=content_gaps,
        market_data=market_data,
        tier=tier,
        financial_model=financial_model,
        business_plan_context=business_plan_context,
    )

    messages = [{"role": "user", "content": user_message}]

    report_text = ""
    for attempt in range(2):  # max 2 attempts
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )
        report_text = message.content[0].text

        issues = _validate(report_text, min_chars)
        if not issues:
            return report_text

        if attempt == 0:
            issues_str = "\n".join(f"- {issue}" for issue in issues)
            messages.append({"role": "assistant", "content": report_text})
            messages.append({
                "role": "user",
                "content": (
                    f"다음 품질 검증에서 실패했습니다. 수정하여 완전한 보고서를 다시 작성하세요:\n\n"
                    f"{issues_str}\n\n"
                    "위 문제를 모두 해결하여 처음부터 완전한 보고서를 작성하세요."
                ),
            })

    return report_text  # Return last attempt even if validation fails
