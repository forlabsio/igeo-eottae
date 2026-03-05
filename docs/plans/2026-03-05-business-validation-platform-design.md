# Business Validation Platform — Design

**Date**: 2026-03-05
**Status**: Confirmed

---

## Overview

AI 기반 비즈니스 검증 플랫폼. 사용자가 웹사이트 URL + 업종 + 지역을 입력하면, AI 에이전트가 경쟁사 분석 → SEO 감사 → 키워드 리서치 → 시장 조사를 병렬로 실행하고, Claude Haiku로 맥킨지 스타일 보고서를 자동 생성한다.

**핵심 가치**:
- 24~90분 내 보고서 완성 (Tier별 상이)
- ₩99,000~₩999,000 (기존 컨설팅 대비 1/100)
- Playwright 기반 공개 데이터 수집 (API 비용 최소화)
- Claude Haiku API (빠르고 비용 효율적)

---

## Architecture

```
[Next.js :3000]  ←→  [FastAPI :8000]  →  Redis  →  [Celery Worker]
                            │                               │
                      PostgreSQL                    Playwright (크롤링)
                                                   Claude Haiku API (보고서)
```

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TailwindCSS + shadcn/ui |
| Backend | Python FastAPI (async) |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic API |
| Scraping | Playwright (Python) |
| Queue | Celery + Redis |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| PDF | WeasyPrint |
| Auth (Phase 3) | NextAuth.js |
| Payment (Phase 3) | Toss Payments |

---

## Directory Structure

```
~/business-validation-platform/
├── frontend/                     # Next.js 14
│   ├── src/app/
│   │   ├── page.tsx              # 랜딩 페이지 (Hero, Features, Pricing, FAQ)
│   │   ├── dashboard/page.tsx    # 보고서 대시보드
│   │   └── api/                  # 프록시 라우트 (FastAPI 호출)
│   └── src/components/
│       ├── UrlInputForm.tsx      # 메인 입력 폼 (React Hook Form + Zod)
│       ├── ReportCard.tsx        # 보고서 카드 (진행 상황 포함)
│       └── LoadingSpinner.tsx
│
└── backend/                      # Python FastAPI
    ├── app/
    │   ├── main.py               # FastAPI 앱 진입점
    │   ├── api/
    │   │   └── routes/
    │   │       ├── reports.py    # CRUD + 다운로드
    │   │       └── users.py      # 인증 (Phase 3)
    │   ├── agents/               # AI Agent 로직
    │   │   ├── orchestrator.py   # 메인 워크플로우
    │   │   ├── competitor.py     # 경쟁사 발굴 (Playwright)
    │   │   ├── gap_analysis.py   # 콘텐츠 갭
    │   │   ├── seo_audit.py      # 기술 감사 (스키마 + 속도)
    │   │   ├── keywords.py       # 고의도 키워드 추출
    │   │   ├── gbp_strategy.py   # Google Business Profile 전략
    │   │   ├── market_research.py # TAM/SAM/SOM
    │   │   └── report_gen.py     # Claude Haiku 보고서 생성
    │   ├── scrapers/
    │   │   └── playwright_utils.py  # 크롤링 유틸
    │   ├── models/               # SQLAlchemy 모델
    │   │   └── models.py
    │   ├── schemas/              # Pydantic 스키마
    │   │   └── schemas.py
    │   └── celery_app.py         # Celery 설정
    ├── alembic/                  # DB 마이그레이션
    ├── requirements.txt
    └── .env.example
```

---

## Database Schema

```sql
users (id, email, name, created_at)
reports (id, user_id, website_url, industry, target_region, status, tier, created_at, completed_at)
competitors (id, report_id, url, domain_authority, monthly_traffic, strengths, weaknesses)
keywords (id, report_id, keyword, search_volume, difficulty, cpc, intent)
content_gaps (id, report_id, topic, search_volume, priority, reason)
seo_audits (id, report_id, page_speed, mobile_score, schema_count, recommendations)
gbp_strategies (id, report_id, posting_frequency, content_types, cta_style, templates)
final_reports (id, report_id, markdown_content, pdf_url, created_at)
```

---

## API Endpoints

```
POST /api/reports/create            → report 생성 + Celery 큐 추가
GET  /api/reports/{id}/status       → 진행률 폴링 (0~100%)
GET  /api/reports/{id}/download     → Markdown/PDF URL
GET  /api/reports/{id}/preview      → Executive Summary 미리보기
GET  /api/reports/                  → 사용자 보고서 목록 (Phase 3: 인증 필요)
```

---

## AI Agent Workflow

```python
async def run_analysis(report_id: str):
    # 1. 경쟁사 발굴 (Playwright → Google 검색 크롤링)
    competitors = await discover_competitors(industry, region)

    # 2. 병렬 분석 (5개 동시)
    gap, audit, keywords, gbp, market = await asyncio.gather(
        gap_analysis(website_url, competitors),
        technical_audit(website_url, competitors),
        keyword_research(industry, region),
        gbp_strategy(competitors),
        market_research(industry, region)
    )

    # 3. Claude Haiku로 맥킨지 스타일 보고서 생성 (~16K tokens)
    markdown = await generate_report(gap, audit, keywords, gbp, market)

    # 4. WeasyPrint로 PDF 변환 + S3/로컬 저장
    pdf_url = await convert_to_pdf(markdown)

    # 5. DB에 완료 상태 저장
    await save_report(report_id, markdown, pdf_url)
```

**처리 시간 예상**:
- Tier 1 (경쟁사 3개): 15~30분
- Tier 2 (경쟁사 10개): 60~90분
- Tier 3 (경쟁사 20개): 2~3시간

---

## Pricing Tiers

| Tier | 가격 | 경쟁사 수 | 키워드 | 보고서 |
|------|------|---------|--------|--------|
| 빠른 검증 | ₩99,000 | 3개 | 20개 | 20p MD |
| 심층 분석 ⭐ | ₩299,000 | 10개 | 50개 | 50p MD+PDF |
| 전략+실행 | ₩999,000 | 20개 | 100개 | 100p MD+PDF+PPT |

---

## Development Phases

### Phase 1 (2주): MVP
- FastAPI 백엔드 기초 (DB, Celery, API)
- Playwright 경쟁사 발굴 + 기본 분석
- Claude Haiku 보고서 생성 (Executive Summary + SWOT)
- Next.js 랜딩 페이지 + 대시보드
- Markdown 다운로드

### Phase 2 (4주): 고급 기능
- GBP 전략 + 키워드 리서치 완성
- PDF 다운로드 (WeasyPrint)
- 맥킨지 스타일 전체 보고서 템플릿
- 보고서 미리보기

### Phase 3 (8주): 상용화
- 사용자 인증 (NextAuth.js)
- Toss Payments 결제 시스템
- 보고서 히스토리 대시보드
- 성능 최적화 (캐싱, 병렬)
- Sentry 모니터링

---

## Risks

1. **크롤링 차단**: Playwright User-Agent 조작 + 딜레이 적용
2. **보고서 품질**: 업종별 프롬프트 튜닝 + 사용자 피드백 반영
3. **법적 이슈**: robots.txt 준수, 공개 데이터만 수집
4. **비용**: Redis 캐싱으로 Claude Haiku API 호출 최소화
