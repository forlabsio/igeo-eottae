# Business Validation Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 기반 비즈니스 검증 플랫폼 - URL 입력 → 경쟁사 분석 → 맥킨지 스타일 보고서 자동 생성

**Architecture:** FastAPI (Python) 백엔드 + Next.js 프론트엔드 분리 구조. Playwright로 Google 크롤링 + 경쟁사 사이트 분석. Claude Haiku API로 보고서 생성. Celery + Redis로 비동기 분석 처리.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, Alembic, Celery, Redis, Playwright, Anthropic Python SDK, Next.js 14, TailwindCSS, shadcn/ui, PostgreSQL, WeasyPrint

---

## Phase 1: MVP (핵심 기능)

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `~/business-validation-platform/backend/requirements.txt`
- Create: `~/business-validation-platform/backend/.env.example`
- Create: `~/business-validation-platform/backend/app/__init__.py`
- Create: `~/business-validation-platform/backend/app/main.py`

**Step 1: 프로젝트 디렉토리 생성**

```bash
mkdir -p ~/business-validation-platform/backend/app/{api/routes,agents,scrapers,models,schemas}
mkdir -p ~/business-validation-platform/backend/tests
touch ~/business-validation-platform/backend/app/__init__.py
touch ~/business-validation-platform/backend/app/api/__init__.py
touch ~/business-validation-platform/backend/app/api/routes/__init__.py
touch ~/business-validation-platform/backend/app/agents/__init__.py
touch ~/business-validation-platform/backend/app/scrapers/__init__.py
touch ~/business-validation-platform/backend/app/models/__init__.py
touch ~/business-validation-platform/backend/app/schemas/__init__.py
```

**Step 2: requirements.txt 작성**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.36
alembic==1.14.0
asyncpg==0.30.0
psycopg2-binary==2.9.9
celery[redis]==5.3.6
redis==5.0.8
playwright==1.49.0
anthropic==0.40.0
weasyprint==62.3
pydantic==2.9.0
pydantic-settings==2.6.0
python-dotenv==1.0.1
httpx==0.27.2
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-mock==3.14.0
```

**Step 3: .env.example 작성**

```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/bizvalidation
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

**Step 4: FastAPI 앱 기초 (app/main.py)**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import reports
from app.config import settings

app = FastAPI(title="Business Validation Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: 설정 파일 (app/config.py)**

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 6: 서버 실행 확인**

```bash
cd ~/business-validation-platform/backend
python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/health 에서 {"status": "ok"} 확인
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize FastAPI backend scaffold"
```

---

### Task 2: 데이터베이스 설정

**Files:**
- Create: `~/business-validation-platform/backend/app/models/models.py`
- Create: `~/business-validation-platform/backend/app/db.py`
- Create: `~/business-validation-platform/backend/alembic.ini`
- Create: `~/business-validation-platform/backend/alembic/env.py`

**Step 1: SQLAlchemy 모델 작성 (app/models/models.py)**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    reports = relationship("Report", back_populates="user")

class Report(Base):
    __tablename__ = "reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    website_url = Column(String(500), nullable=False)
    industry = Column(String(100))
    target_region = Column(String(100))
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    progress = Column(Integer, default=0)  # 0-100
    tier = Column(String(50), default="basic")  # basic, pro, premium
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="reports")
    competitors = relationship("Competitor", back_populates="report", cascade="all, delete-orphan")
    keywords = relationship("Keyword", back_populates="report", cascade="all, delete-orphan")
    content_gaps = relationship("ContentGap", back_populates="report", cascade="all, delete-orphan")
    seo_audits = relationship("SEOAudit", back_populates="report", cascade="all, delete-orphan")
    gbp_strategies = relationship("GBPStrategy", back_populates="report", cascade="all, delete-orphan")
    final_reports = relationship("FinalReport", back_populates="report", cascade="all, delete-orphan")

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    url = Column(String(500), nullable=False)
    domain_authority = Column(Integer, nullable=True)
    monthly_traffic = Column(Integer, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    report = relationship("Report", back_populates="competitors")

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    keyword = Column(String(255), nullable=False)
    search_volume = Column(Integer, nullable=True)
    difficulty = Column(String(50))  # low, medium, high
    cpc = Column(Numeric(10, 2), nullable=True)
    intent = Column(String(50))  # informational, commercial, transactional
    report = relationship("Report", back_populates="keywords")

class ContentGap(Base):
    __tablename__ = "content_gaps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    topic = Column(String(255), nullable=False)
    search_volume = Column(Integer, nullable=True)
    priority = Column(String(50))  # HIGH, MEDIUM, LOW
    reason = Column(Text)
    report = relationship("Report", back_populates="content_gaps")

class SEOAudit(Base):
    __tablename__ = "seo_audits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    page_speed = Column(Numeric(5, 2), nullable=True)
    mobile_score = Column(Integer, nullable=True)
    schema_count = Column(Integer, nullable=True)
    recommendations = Column(JSON, default=list)
    report = relationship("Report", back_populates="seo_audits")

class GBPStrategy(Base):
    __tablename__ = "gbp_strategies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    posting_frequency = Column(String(100))
    content_types = Column(JSON, default=dict)
    cta_style = Column(String(255))
    templates = Column(JSON, default=list)
    report = relationship("Report", back_populates="gbp_strategies")

class FinalReport(Base):
    __tablename__ = "final_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    markdown_content = Column(Text)
    pdf_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="final_reports")
```

**Step 2: DB 세션 설정 (app/db.py)**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.models.models import Base

engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

**Step 3: Alembic 초기화 + 마이그레이션 생성**

```bash
cd ~/business-validation-platform/backend
alembic init alembic
# alembic/env.py에서 target_metadata 설정 필요
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

**Step 4: 테스트 - 테이블 생성 확인**

```bash
# PostgreSQL에서 확인
psql -d bizvalidation -c "\dt"
# → users, reports, competitors, keywords 등 테이블 목록 확인
```

**Step 5: Commit**

```bash
git add app/models/ app/db.py alembic/
git commit -m "feat: add database models and migrations"
```

---

### Task 3: Celery 비동기 작업 큐

**Files:**
- Create: `~/business-validation-platform/backend/app/celery_app.py`
- Create: `~/business-validation-platform/backend/app/tasks.py`

**Step 1: Celery 앱 설정 (app/celery_app.py)**

```python
from celery import Celery
from app.config import settings

celery_app = Celery(
    "bizvalidation",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_routes={
        "app.tasks.run_business_validation": {"queue": "analysis"},
    },
)
```

**Step 2: 메인 태스크 (app/tasks.py)**

```python
from celery import shared_task
from app.celery_app import celery_app
import asyncio

@celery_app.task(bind=True, name="app.tasks.run_business_validation")
def run_business_validation(self, report_id: str):
    """비즈니스 검증 분석 태스크"""
    from app.agents.orchestrator import run_analysis
    asyncio.run(run_analysis(report_id))
```

**Step 3: Worker 실행 테스트**

```bash
# 터미널 1: Redis 확인
redis-cli ping  # → PONG

# 터미널 2: Celery Worker
cd ~/business-validation-platform/backend
celery -A app.celery_app worker --loglevel=info -Q analysis

# 터미널 3: 태스크 수동 실행
python -c "from app.tasks import run_business_validation; run_business_validation.delay('test-uuid')"
# → Worker에서 태스크 수신 로그 확인
```

**Step 4: Commit**

```bash
git add app/celery_app.py app/tasks.py
git commit -m "feat: add Celery task queue with Redis broker"
```

---

### Task 4: Playwright 크롤링 유틸리티

**Files:**
- Create: `~/business-validation-platform/backend/app/scrapers/playwright_utils.py`
- Create: `~/business-validation-platform/backend/tests/test_scrapers.py`

**Step 1: 실패하는 테스트 작성**

```python
# tests/test_scrapers.py
import pytest
from app.scrapers.playwright_utils import fetch_page_content, extract_schema_markup

@pytest.mark.asyncio
async def test_fetch_page_content_returns_html():
    result = await fetch_page_content("https://example.com")
    assert result is not None
    assert "Example Domain" in result["title"]
    assert result["html"] is not None

@pytest.mark.asyncio
async def test_extract_schema_returns_list():
    html = '<script type="application/ld+json">{"@type": "Organization"}</script>'
    schemas = extract_schema_markup(html)
    assert len(schemas) == 1
    assert schemas[0]["@type"] == "Organization"

@pytest.mark.asyncio
async def test_fetch_returns_none_on_invalid_url():
    result = await fetch_page_content("https://this-url-does-not-exist-xyz.com", timeout=5000)
    assert result is None
```

**Step 2: 테스트 실패 확인**

```bash
pytest tests/test_scrapers.py -v
# → FAILED: playwright_utils 모듈 없음
```

**Step 3: Playwright 유틸 구현 (app/scrapers/playwright_utils.py)**

```python
import json
import re
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

async def fetch_page_content(url: str, timeout: int = 15000) -> Optional[Dict[str, Any]]:
    """웹페이지 콘텐츠 수집"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
            })
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            title = await page.title()
            html = await page.content()

            # H1~H3 태그 추출
            headings = await page.evaluate("""() => {
                const tags = [...document.querySelectorAll('h1, h2, h3')];
                return tags.map(t => ({ tag: t.tagName, text: t.innerText.trim() }));
            }""")

            # 메타 태그 추출
            meta = await page.evaluate("""() => ({
                description: document.querySelector('meta[name="description"]')?.content,
                keywords: document.querySelector('meta[name="keywords"]')?.content,
            })""")

            return {
                "url": url,
                "title": title,
                "html": html,
                "headings": headings[:50],  # 최대 50개
                "meta": meta,
            }
        except PlaywrightTimeout:
            return None
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            return None
        finally:
            await browser.close()

def extract_schema_markup(html: str) -> List[Dict]:
    """JSON-LD 스키마 마크업 추출"""
    schemas = []
    pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    matches = re.findall(pattern, html, re.DOTALL)
    for match in matches:
        try:
            schema = json.loads(match.strip())
            schemas.append(schema)
        except json.JSONDecodeError:
            continue
    return schemas

async def search_google(query: str, num_results: int = 10) -> List[str]:
    """Google 검색 결과 URL 추출"""
    search_url = f"https://www.google.com/search?q={query}&num={num_results}&hl=ko"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })
            await page.goto(search_url, wait_until="domcontentloaded", timeout=15000)

            # 검색 결과 링크 추출 (광고 제외)
            urls = await page.evaluate("""() => {
                const links = [...document.querySelectorAll('div.g a[href]')];
                return links
                    .map(a => a.href)
                    .filter(href => href.startsWith('http') && !href.includes('google.com'))
                    .slice(0, 15);
            }""")
            return list(dict.fromkeys(urls))[:num_results]  # 중복 제거
        except Exception as e:
            print(f"Google search failed: {e}")
            return []
        finally:
            await browser.close()
```

**Step 4: Playwright 브라우저 설치**

```bash
playwright install chromium
```

**Step 5: 테스트 통과 확인**

```bash
pytest tests/test_scrapers.py -v
# → PASSED: 3/3 tests
```

**Step 6: Commit**

```bash
git add app/scrapers/ tests/test_scrapers.py
git commit -m "feat: add Playwright scraping utilities with tests"
```

---

### Task 5: 경쟁사 발굴 Agent

**Files:**
- Create: `~/business-validation-platform/backend/app/agents/competitor.py`
- Create: `~/business-validation-platform/backend/tests/test_competitor_agent.py`

**Step 1: 실패하는 테스트 작성**

```python
# tests/test_competitor_agent.py
import pytest
from unittest.mock import AsyncMock, patch
from app.agents.competitor import discover_competitors

@pytest.mark.asyncio
async def test_discover_competitors_returns_list():
    with patch("app.agents.competitor.search_google", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = [
            "https://comp1.com", "https://comp2.com", "https://comp3.com",
            "https://google.com",  # 필터링되어야 함
        ]
        result = await discover_competitors("법률 서비스", "서울", max_results=3)
        assert isinstance(result, list)
        assert len(result) <= 3
        # google.com은 제외되어야 함
        assert not any("google.com" in url for url in result)

@pytest.mark.asyncio
async def test_manual_competitors_extended():
    """사용자가 경쟁사 제공 시 추가 발굴"""
    with patch("app.agents.competitor.search_google", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = ["https://extra1.com", "https://extra2.com"]
        manual = ["https://manual1.com", "https://manual2.com"]
        result = await discover_competitors("법률 서비스", "서울", manual_competitors=manual)
        # 수동 입력 경쟁사가 포함되어야 함
        assert "https://manual1.com" in result
```

**Step 2: 경쟁사 발굴 구현 (app/agents/competitor.py)**

```python
from typing import List, Optional
from urllib.parse import urlparse
from app.scrapers.playwright_utils import search_google

# 광고/디렉토리/SNS 등 필터링 대상 도메인
BLACKLIST_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "instagram.com",
    "naver.com", "kakao.com", "daum.net", "wikipedia.org",
    "namu.wiki", "yelp.com", "tripadvisor.com",
}

def _is_valid_competitor(url: str) -> bool:
    """광고/디렉토리 사이트 필터링"""
    try:
        domain = urlparse(url).netloc.replace("www.", "")
        return not any(blacklisted in domain for blacklisted in BLACKLIST_DOMAINS)
    except Exception:
        return False

async def discover_competitors(
    industry: str,
    region: str,
    manual_competitors: Optional[List[str]] = None,
    max_results: int = 10,
) -> List[str]:
    """경쟁사 URL 목록 자동 발굴"""
    competitors = list(manual_competitors or [])

    # Google 검색으로 추가 발굴
    additional_needed = max_results - len(competitors)
    if additional_needed > 0:
        queries = [
            f"{industry} {region} site:*.com OR site:*.co.kr",
            f"{industry} 업체 {region}",
        ]
        found = []
        for query in queries:
            results = await search_google(query, num_results=15)
            found.extend(results)
            if len(found) >= additional_needed * 2:
                break

        # 필터링 및 중복 제거
        valid = [url for url in found if _is_valid_competitor(url)]
        unique_valid = list(dict.fromkeys(valid))

        # 수동 경쟁사와 중복 제거 후 추가
        existing_domains = {urlparse(c).netloc for c in competitors}
        for url in unique_valid:
            if urlparse(url).netloc not in existing_domains:
                competitors.append(url)
                existing_domains.add(urlparse(url).netloc)
            if len(competitors) >= max_results:
                break

    return competitors[:max_results]
```

**Step 3: 테스트 통과 확인**

```bash
pytest tests/test_competitor_agent.py -v
# → PASSED: 2/2 tests
```

**Step 4: Commit**

```bash
git add app/agents/competitor.py tests/test_competitor_agent.py
git commit -m "feat: add competitor discovery agent"
```

---

### Task 6: SEO 기술 감사 Agent

**Files:**
- Create: `~/business-validation-platform/backend/app/agents/seo_audit.py`
- Create: `~/business-validation-platform/backend/tests/test_seo_audit.py`

**Step 1: 실패하는 테스트 작성**

```python
# tests/test_seo_audit.py
import pytest
from unittest.mock import AsyncMock, patch
from app.agents.seo_audit import audit_website, compare_with_competitors

@pytest.mark.asyncio
async def test_audit_website_extracts_schema():
    mock_content = {
        "url": "https://example.com",
        "title": "Test",
        "html": '<script type="application/ld+json">{"@type": "LocalBusiness"}</script>',
        "headings": [],
        "meta": {},
    }
    with patch("app.agents.seo_audit.fetch_page_content", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_content
        result = await audit_website("https://example.com")
        assert result["schema_types"] == ["LocalBusiness"]
        assert result["schema_count"] == 1

@pytest.mark.asyncio
async def test_compare_with_competitors_returns_recommendations():
    our_audit = {"schema_count": 1, "schema_types": ["LocalBusiness"]}
    competitor_audits = [
        {"schema_count": 3, "schema_types": ["LocalBusiness", "FAQ", "Review"]},
        {"schema_count": 2, "schema_types": ["LocalBusiness", "FAQ"]},
    ]
    result = compare_with_competitors(our_audit, competitor_audits)
    assert "missing_schemas" in result
    assert "FAQ" in result["missing_schemas"]
    assert "Review" in result["missing_schemas"]
```

**Step 2: SEO 감사 구현 (app/agents/seo_audit.py)**

```python
from typing import Dict, List, Any
from app.scrapers.playwright_utils import fetch_page_content, extract_schema_markup

async def audit_website(url: str) -> Dict[str, Any]:
    """웹사이트 SEO 기술 감사"""
    content = await fetch_page_content(url)
    if not content:
        return {"url": url, "error": "Failed to fetch", "schema_count": 0, "schema_types": []}

    schemas = extract_schema_markup(content["html"])
    schema_types = [s.get("@type", "Unknown") for s in schemas]

    # 메타 태그 완성도 계산
    meta = content.get("meta", {})
    meta_score = sum([
        bool(content.get("title")),
        bool(meta.get("description")),
        bool(meta.get("keywords")),
    ]) / 3 * 100

    return {
        "url": url,
        "title": content["title"],
        "schema_count": len(schemas),
        "schema_types": schema_types,
        "schemas": schemas,
        "meta_completeness": round(meta_score),
        "headings_count": len(content.get("headings", [])),
    }

def compare_with_competitors(
    our_audit: Dict, competitor_audits: List[Dict]
) -> Dict[str, Any]:
    """우리 사이트 vs 경쟁사 비교 분석"""
    if not competitor_audits:
        return {"missing_schemas": [], "recommendations": []}

    # 경쟁사들이 사용하는 스키마 유형 수집
    competitor_schema_types = set()
    for audit in competitor_audits:
        competitor_schema_types.update(audit.get("schema_types", []))

    our_types = set(our_audit.get("schema_types", []))
    missing_schemas = list(competitor_schema_types - our_types)

    # 우선순위 결정 (경쟁사 대다수가 사용하는 것 HIGH)
    recommendations = []
    for schema_type in missing_schemas:
        count = sum(1 for a in competitor_audits if schema_type in a.get("schema_types", []))
        priority = "HIGH" if count >= len(competitor_audits) * 0.6 else "MEDIUM"
        recommendations.append({"schema_type": schema_type, "priority": priority, "competitor_usage": count})

    recommendations.sort(key=lambda x: (x["priority"] == "HIGH", x["competitor_usage"]), reverse=True)

    avg_competitor_schemas = sum(a.get("schema_count", 0) for a in competitor_audits) / len(competitor_audits)

    return {
        "missing_schemas": missing_schemas,
        "recommendations": recommendations,
        "our_schema_count": our_audit.get("schema_count", 0),
        "avg_competitor_schema_count": round(avg_competitor_schemas, 1),
    }
```

**Step 3: 테스트 통과 확인**

```bash
pytest tests/test_seo_audit.py -v
# → PASSED: 2/2 tests
```

**Step 4: Commit**

```bash
git add app/agents/seo_audit.py tests/test_seo_audit.py
git commit -m "feat: add SEO technical audit agent"
```

---

### Task 7: 키워드 리서치 Agent

**Files:**
- Create: `~/business-validation-platform/backend/app/agents/keywords.py`
- Create: `~/business-validation-platform/backend/tests/test_keywords.py`

**Step 1: 테스트 작성**

```python
# tests/test_keywords.py
import pytest
from app.agents.keywords import generate_intent_keywords

def test_generates_near_me_keywords():
    result = generate_intent_keywords("법률 서비스", "서울")
    keywords = [k["keyword"] for k in result]
    assert any("near me" in k or "근처" in k for k in keywords)

def test_generates_price_keywords():
    result = generate_intent_keywords("치과", "강남")
    keywords = [k["keyword"] for k in result]
    assert any("가격" in k or "비용" in k for k in keywords)

def test_returns_at_least_10_keywords():
    result = generate_intent_keywords("헬스장", "부산")
    assert len(result) >= 10

def test_keyword_has_required_fields():
    result = generate_intent_keywords("카페", "홍대")
    for kw in result:
        assert "keyword" in kw
        assert "intent" in kw
        assert "pattern_type" in kw
```

**Step 2: 키워드 리서치 구현 (app/agents/keywords.py)**

```python
from typing import List, Dict

# 고의도 키워드 패턴 정의
KEYWORD_PATTERNS = [
    # Near me / 위치 기반
    ("{industry} near me", "transactional", "near_me"),
    ("{industry} 근처", "transactional", "near_me"),
    ("{region} {industry}", "transactional", "local"),
    ("{industry} {region}", "transactional", "local"),
    # Emergency / 긴급
    ("긴급 {industry}", "transactional", "emergency"),
    ("당일 {industry}", "transactional", "emergency"),
    ("{industry} 24시간", "transactional", "emergency"),
    # 가격 비교
    ("{industry} 가격", "commercial", "price"),
    ("{industry} 비용", "commercial", "price"),
    ("{industry} 요금", "commercial", "price"),
    ("{industry} 견적", "commercial", "price"),
    # 추천/후기
    ("{industry} 추천", "commercial", "review"),
    ("{industry} 후기", "commercial", "review"),
    ("{region} {industry} 추천", "commercial", "review"),
    # 비교
    ("{industry} 비교", "commercial", "comparison"),
    ("{industry} 잘하는 곳", "commercial", "comparison"),
    # 서비스 탐색
    ("{industry} 상담", "informational", "consultation"),
    ("{industry} 무료 상담", "transactional", "consultation"),
    ("{industry} 예약", "transactional", "booking"),
    ("{industry} 문의", "transactional", "inquiry"),
]

def generate_intent_keywords(industry: str, region: str) -> List[Dict]:
    """고의도 키워드 목록 생성"""
    keywords = []
    seen = set()

    for pattern, intent, pattern_type in KEYWORD_PATTERNS:
        keyword = pattern.format(industry=industry, region=region)
        if keyword not in seen:
            seen.add(keyword)
            keywords.append({
                "keyword": keyword,
                "intent": intent,
                "pattern_type": pattern_type,
                # 실제 검색량은 Claude Haiku로 추정 (report_gen에서 처리)
                "search_volume": None,
                "difficulty": None,
                "cpc": None,
            })

    return keywords
```

**Step 3: 테스트 통과 확인**

```bash
pytest tests/test_keywords.py -v
# → PASSED: 4/4 tests
```

**Step 4: Commit**

```bash
git add app/agents/keywords.py tests/test_keywords.py
git commit -m "feat: add high-intent keyword research agent"
```

---

### Task 8: Claude Haiku 보고서 생성

**Files:**
- Create: `~/business-validation-platform/backend/app/agents/report_gen.py`
- Create: `~/business-validation-platform/backend/tests/test_report_gen.py`

**Step 1: 테스트 작성**

```python
# tests/test_report_gen.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.agents.report_gen import generate_report

@pytest.mark.asyncio
async def test_generate_report_returns_markdown():
    mock_client = MagicMock()
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="# 비즈니스 검증 보고서\n\n## Executive Summary\n\n테스트 내용")]
    mock_client.messages.create = MagicMock(return_value=mock_message)

    with patch("app.agents.report_gen.anthropic.Anthropic", return_value=mock_client):
        result = await generate_report(
            website_url="https://example.com",
            industry="법률 서비스",
            region="서울",
            competitors=[{"url": "https://comp.com", "strengths": [], "weaknesses": []}],
            seo_comparison={"missing_schemas": ["FAQ"], "recommendations": []},
            keywords=[{"keyword": "법률 near me", "intent": "transactional"}],
            content_gaps=[],
            market_data={}
        )
        assert result.startswith("#")
        assert "Executive Summary" in result

@pytest.mark.asyncio
async def test_generate_report_with_empty_data():
    mock_client = MagicMock()
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="# 보고서\n기본 내용")]
    mock_client.messages.create = MagicMock(return_value=mock_message)

    with patch("app.agents.report_gen.anthropic.Anthropic", return_value=mock_client):
        result = await generate_report(
            website_url="https://example.com",
            industry="카페", region="부산",
            competitors=[], seo_comparison={}, keywords=[], content_gaps=[], market_data={}
        )
        assert isinstance(result, str)
        assert len(result) > 0
```

**Step 2: 보고서 생성 구현 (app/agents/report_gen.py)**

```python
import anthropic
import json
from typing import List, Dict, Any
from app.config import settings

REPORT_SYSTEM_PROMPT = """당신은 맥킨지 전략 컨설턴트입니다. 제공된 데이터를 바탕으로 전문적인 비즈니스 검증 보고서를 작성하세요.

보고서 요구사항:
1. Executive Summary (핵심 결론 3~5가지, 검증 점수 XX/100)
2. 시장 분석 (TAM/SAM/SOM 추정, 성장률)
3. 경쟁사 분석 (주요 경쟁사 프로필 테이블, SWOT 분석)
4. 기술 감사 (스키마 비교 테이블, SEO 건강도)
5. 고의도 키워드 Top 20 (테이블 형식)
6. 콘텐츠 갭 분석 (경쟁사가 다루지 않는 주제)
7. GBP 전략 (포스팅 전략 + 10개 템플릿)
8. 실행 로드맵 (즉시/단기/중기 우선순위별)
9. 예상 ROI (수치 포함)
10. 리스크 분석 및 대응 방안

어조: 단호하고 구체적. "~할 수도 있습니다" 대신 "~하세요". 모든 주장에 근거 제시."""

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
        "competitors": competitors[:10],  # 최대 10개
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
보고서는 최소 2,000자 이상이어야 하며, 모든 섹션을 포함해야 합니다."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8096,
        system=REPORT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return message.content[0].text
```

**Step 3: 테스트 통과 확인**

```bash
pytest tests/test_report_gen.py -v
# → PASSED: 2/2 tests
```

**Step 4: Commit**

```bash
git add app/agents/report_gen.py tests/test_report_gen.py
git commit -m "feat: add Claude Haiku report generation"
```

---

### Task 9: Agent 오케스트레이터

**Files:**
- Create: `~/business-validation-platform/backend/app/agents/orchestrator.py`

**Step 1: 오케스트레이터 구현**

```python
import asyncio
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app.models.models import Report, Competitor, Keyword, ContentGap, SEOAudit, FinalReport
from app.agents.competitor import discover_competitors
from app.agents.seo_audit import audit_website, compare_with_competitors
from app.agents.keywords import generate_intent_keywords
from app.agents.report_gen import generate_report

async def _update_progress(db: AsyncSession, report_id: str, progress: int, status: str = "processing"):
    """진행 상황 업데이트"""
    report = await db.get(Report, uuid.UUID(report_id))
    if report:
        report.progress = progress
        report.status = status
        await db.commit()

async def run_analysis(report_id: str):
    """비즈니스 검증 전체 분석 실행"""
    async with AsyncSessionLocal() as db:
        report = await db.get(Report, uuid.UUID(report_id))
        if not report:
            print(f"Report {report_id} not found")
            return

        try:
            # 1. 경쟁사 발굴 (10%)
            await _update_progress(db, report_id, 10)
            tier_limits = {"basic": 3, "pro": 10, "premium": 20}
            max_competitors = tier_limits.get(report.tier, 3)

            competitors = await discover_competitors(
                industry=report.industry,
                region=report.target_region or "",
                max_results=max_competitors,
            )

            # DB에 경쟁사 저장
            for url in competitors:
                comp = Competitor(report_id=report.id, url=url)
                db.add(comp)
            await db.commit()

            # 2. 병렬 분석 (10% → 70%)
            await _update_progress(db, report_id, 20)

            our_audit_task = audit_website(report.website_url)
            competitor_audits_tasks = [audit_website(url) for url in competitors[:5]]
            keywords_task = asyncio.create_task(
                asyncio.to_thread(generate_intent_keywords, report.industry, report.target_region or "")
            )

            our_audit, *competitor_audits_results = await asyncio.gather(
                our_audit_task, *competitor_audits_tasks
            )
            keywords = generate_intent_keywords(report.industry, report.target_region or "")

            await _update_progress(db, report_id, 50)

            # 3. SEO 비교 분석
            seo_comparison = compare_with_competitors(our_audit, competitor_audits_results)

            # SEO 감사 DB 저장
            seo = SEOAudit(
                report_id=report.id,
                schema_count=our_audit.get("schema_count", 0),
                recommendations=seo_comparison.get("recommendations", []),
            )
            db.add(seo)

            # 키워드 DB 저장
            for kw in keywords[:20]:
                keyword = Keyword(
                    report_id=report.id,
                    keyword=kw["keyword"],
                    intent=kw["intent"],
                )
                db.add(keyword)

            await db.commit()
            await _update_progress(db, report_id, 70)

            # 4. 보고서 생성 (70% → 90%)
            competitors_data = [{"url": c.url, "strengths": c.strengths or [], "weaknesses": c.weaknesses or []}
                              for c in await db.execute(
                                  __import__('sqlalchemy').select(Competitor).where(Competitor.report_id == report.id)
                              ).scalars().all()]

            markdown = await generate_report(
                website_url=report.website_url,
                industry=report.industry,
                region=report.target_region or "",
                competitors=[{"url": url, "audit": a} for url, a in zip(competitors, competitor_audits_results)],
                seo_comparison=seo_comparison,
                keywords=keywords[:20],
                content_gaps=[],
                market_data={"industry": report.industry, "region": report.target_region},
            )

            await _update_progress(db, report_id, 90)

            # 5. 저장 (90% → 100%)
            final = FinalReport(report_id=report.id, markdown_content=markdown)
            db.add(final)

            from datetime import datetime
            report.status = "completed"
            report.progress = 100
            report.completed_at = datetime.utcnow()
            await db.commit()

            print(f"Report {report_id} completed successfully")

        except Exception as e:
            print(f"Report {report_id} failed: {e}")
            await _update_progress(db, report_id, 0, "failed")
            raise
```

**Step 2: Commit**

```bash
git add app/agents/orchestrator.py
git commit -m "feat: add analysis orchestrator with progress tracking"
```

---

### Task 10: FastAPI API 엔드포인트

**Files:**
- Create: `~/business-validation-platform/backend/app/schemas/schemas.py`
- Create: `~/business-validation-platform/backend/app/api/routes/reports.py`
- Create: `~/business-validation-platform/backend/tests/test_api.py`

**Step 1: Pydantic 스키마 (app/schemas/schemas.py)**

```python
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
import uuid

class ReportCreate(BaseModel):
    website_url: str
    industry: str
    target_region: Optional[str] = None
    competitors: Optional[List[str]] = None
    tier: str = "basic"

class ReportStatus(BaseModel):
    report_id: uuid.UUID
    status: str
    progress: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReportDownload(BaseModel):
    report_id: uuid.UUID
    markdown_url: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: Optional[datetime] = None

class ReportPreview(BaseModel):
    report_id: uuid.UUID
    status: str
    validation_score: Optional[int] = None
    executive_summary: Optional[str] = None
```

**Step 2: API 라우트 (app/api/routes/reports.py)**

```python
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models.models import Report, User, FinalReport
from app.schemas.schemas import ReportCreate, ReportStatus, ReportDownload, ReportPreview
from app.tasks import run_business_validation

router = APIRouter()

@router.post("/create", response_model=ReportStatus)
async def create_report(body: ReportCreate, db: AsyncSession = Depends(get_db)):
    """보고서 생성 요청"""
    # 임시 사용자 (Phase 3에서 인증 추가)
    user_result = await db.execute(select(User).where(User.email == "guest@example.com"))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(email="guest@example.com", name="Guest")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    report = Report(
        user_id=user.id,
        website_url=body.website_url,
        industry=body.industry,
        target_region=body.target_region,
        tier=body.tier,
        status="pending",
        progress=0,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Celery 태스크 큐에 추가
    run_business_validation.delay(str(report.id))

    return report

@router.get("/{report_id}/status", response_model=ReportStatus)
async def get_report_status(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/download", response_model=ReportDownload)
async def download_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != "completed":
        raise HTTPException(status_code=400, detail=f"Report is not ready: {report.status}")

    final_result = await db.execute(
        select(FinalReport).where(FinalReport.report_id == report_id)
    )
    final = final_result.scalar_one_or_none()

    return ReportDownload(
        report_id=report_id,
        markdown_url=f"/api/reports/{report_id}/markdown",
        pdf_url=final.pdf_url if final else None,
        created_at=final.created_at if final else None,
    )

@router.get("/{report_id}/preview", response_model=ReportPreview)
async def preview_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    executive_summary = None
    if report.status == "completed":
        final_result = await db.execute(
            select(FinalReport).where(FinalReport.report_id == report_id)
        )
        final = final_result.scalar_one_or_none()
        if final and final.markdown_content:
            # Executive Summary 섹션 추출
            lines = final.markdown_content.split("\n")
            summary_lines = []
            in_summary = False
            for line in lines:
                if "Executive Summary" in line:
                    in_summary = True
                    continue
                if in_summary and line.startswith("## "):
                    break
                if in_summary:
                    summary_lines.append(line)
            executive_summary = "\n".join(summary_lines[:20]).strip()

    return ReportPreview(
        report_id=report_id,
        status=report.status,
        executive_summary=executive_summary,
    )

@router.get("/{report_id}/markdown")
async def get_markdown(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from fastapi.responses import PlainTextResponse
    final_result = await db.execute(
        select(FinalReport).where(FinalReport.report_id == report_id)
    )
    final = final_result.scalar_one_or_none()
    if not final:
        raise HTTPException(status_code=404, detail="Report not found")
    return PlainTextResponse(final.markdown_content, media_type="text/markdown")
```

**Step 3: API 통합 테스트 작성**

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_create_report_returns_pending():
    with patch("app.api.routes.reports.run_business_validation") as mock_task:
        mock_task.delay = MagicMock()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/reports/create", json={
                "website_url": "https://example.com",
                "industry": "법률 서비스",
                "target_region": "서울",
                "tier": "basic"
            })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert "report_id" in data
```

**Step 4: 테스트 통과 확인**

```bash
pytest tests/test_api.py -v
# → PASSED
```

**Step 5: Commit**

```bash
git add app/schemas/ app/api/routes/reports.py tests/test_api.py
git commit -m "feat: add FastAPI REST endpoints for reports"
```

---

### Task 11: Next.js 프론트엔드 초기화

**Files:**
- Create: `~/business-validation-platform/frontend/` (Next.js 프로젝트)

**Step 1: Next.js 프로젝트 생성**

```bash
cd ~/business-validation-platform
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Step 2: shadcn/ui 설치**

```bash
cd frontend
npx shadcn@latest init
# → style: default, base color: slate, CSS variables: yes
npx shadcn@latest add button card input label select badge progress
```

**Step 3: 환경 변수 설정**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 4: 빌드 테스트**

```bash
npm run build
# → 에러 없이 빌드 성공
```

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js frontend with shadcn/ui"
```

---

### Task 12: 랜딩 페이지

**Files:**
- Modify: `~/business-validation-platform/frontend/app/page.tsx`
- Create: `~/business-validation-platform/frontend/components/UrlInputForm.tsx`

**Step 1: URL 입력 폼 컴포넌트**

```typescript
// components/UrlInputForm.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const INDUSTRIES = [
  "법률 서비스", "의료/병원", "치과", "헬스장/피트니스", "카페/음식점",
  "부동산", "학원/교육", "미용실/뷰티", "세무/회계", "IT 서비스",
  "쇼핑몰", "건설/인테리어", "여행/관광", "자동차 서비스", "반려동물",
];

const TIERS = [
  { id: "basic", name: "빠른 검증", price: "₩99,000", desc: "경쟁사 3개, 20페이지" },
  { id: "pro", name: "심층 분석 ⭐", price: "₩299,000", desc: "경쟁사 10개, 50페이지 + PDF" },
  { id: "premium", name: "전략+실행", price: "₩999,000", desc: "경쟁사 20개, 100페이지 + PPT" },
];

export function UrlInputForm() {
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [tier, setTier] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !industry) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: url, industry, target_region: region, tier }),
      });

      if (!res.ok) throw new Error("보고서 생성 실패");
      const data = await res.json();
      setReportId(data.report_id);
      window.location.href = `/dashboard?id=${data.report_id}`;
    } catch (err) {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-xl max-w-2xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="url">웹사이트 URL *</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>업종 *</Label>
        <Select onValueChange={setIndustry} required>
          <SelectTrigger><SelectValue placeholder="업종을 선택하세요" /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">타겟 지역 (선택)</Label>
        <Input id="region" placeholder="서울, 강남, 부산 등" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label>분석 패키지</Label>
        <div className="grid grid-cols-3 gap-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                tier === t.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-blue-600 font-bold mt-1">{t.price}</div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
        {loading ? "분석 요청 중..." : "🚀 24시간 내 검증 시작"}
      </Button>
      <p className="text-center text-xs text-gray-400">공개 데이터만 수집합니다. 개인정보 수집 없음.</p>
    </form>
  );
}
```

**Step 2: 랜딩 페이지 (app/page.tsx)**

```typescript
// app/page.tsx
import { UrlInputForm } from "@/components/UrlInputForm";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: "⚡", title: "24시간 내 완성", desc: "AI 에이전트가 밤새 분석. 아침에 결과 확인." },
  { icon: "🔍", title: "경쟁사 자동 분석", desc: "Google에서 주요 경쟁사를 자동 발굴하고 분석." },
  { icon: "📊", title: "맥킨지 스타일 보고서", desc: "Executive Summary, SWOT, 실행 로드맵 포함." },
  { icon: "💡", title: "실행 가능한 인사이트", desc: "추상적 조언이 아닌 구체적 액션 아이템." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero */}
      <section className="px-4 py-24 text-center text-white">
        <Badge className="mb-6 bg-blue-600 text-white">AI 기반 비즈니스 검증 플랫폼</Badge>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          비즈니스 아이디어를<br />
          <span className="text-blue-400">24시간 내 검증</span>하세요
        </h1>
        <p className="text-xl text-slate-300 mb-4">
          맥킨지 스타일 전략 보고서 자동 생성 | ₩99,000부터
        </p>
        <p className="text-slate-400 mb-12">
          기존 컨설팅 대비 10배 빠르고 1/100 가격
        </p>
        <UrlInputForm />
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">무엇이 다른가요?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">간단한 가격 정책</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "빠른 검증", price: "₩99,000", features: ["경쟁사 3개", "20페이지 보고서", "Markdown 다운로드", "24시간 완성"], highlighted: false },
              { name: "심층 분석", price: "₩299,000", features: ["경쟁사 10개", "50페이지 보고서", "PDF + Markdown", "GBP 전략 포함", "48시간 완성"], highlighted: true },
              { name: "전략+실행", price: "₩999,000", features: ["경쟁사 20개", "100페이지 보고서", "PDF + MD + PPT", "6개월 로드맵", "1주 완성"], highlighted: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${plan.highlighted ? "bg-blue-600 text-white shadow-2xl scale-105" : "bg-white border"}`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-6">{plan.price}</div>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm ${plan.highlighted ? "text-blue-100" : "text-gray-600"}`}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 text-sm">
        <p>© 2026 Business Validation Platform. 공개 데이터만 사용합니다.</p>
      </footer>
    </main>
  );
}
```

**Step 3: 빌드 확인**

```bash
cd frontend && npm run build
# → 에러 없이 성공
```

**Step 4: Commit**

```bash
git add frontend/app/page.tsx frontend/components/
git commit -m "feat: add landing page with URL input form"
```

---

### Task 13: 대시보드 (보고서 상태 + 다운로드)

**Files:**
- Create: `~/business-validation-platform/frontend/app/dashboard/page.tsx`
- Create: `~/business-validation-platform/frontend/components/ReportCard.tsx`

**Step 1: ReportCard 컴포넌트**

```typescript
// components/ReportCard.tsx
"use client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReportStatus {
  report_id: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at?: string;
}

export function ReportCard({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${reportId}/status`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);

        if (data.status === "completed" && !preview) {
          const previewRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${reportId}/preview`);
          if (previewRes.ok) {
            const previewData = await previewRes.json();
            setPreview(previewData.executive_summary);
          }
        }
      }
    };

    fetchStatus();
    // 완료될 때까지 5초마다 폴링
    if (report?.status !== "completed" && report?.status !== "failed") {
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [reportId, report?.status]);

  const handleDownload = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${reportId}/markdown`);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-validation-report-${reportId.slice(0, 8)}.md`;
    a.click();
  };

  if (!report) return <div className="animate-pulse bg-gray-100 rounded-xl h-32" />;

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  }[report.status] || "bg-gray-100";

  const statusLabel = { pending: "대기 중", processing: "분석 중", completed: "완료", failed: "실패" }[report.status];

  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">보고서 ID: {report.report_id.slice(0, 8)}...</span>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>

      {report.status === "processing" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>분석 진행 중...</span>
            <span>{report.progress}%</span>
          </div>
          <Progress value={report.progress} />
        </div>
      )}

      {report.status === "completed" && (
        <div className="space-y-4">
          {preview && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {preview}
            </div>
          )}
          <Button onClick={handleDownload} className="w-full">
            📥 Markdown 보고서 다운로드
          </Button>
        </div>
      )}

      {report.status === "failed" && (
        <p className="text-red-500 text-sm">분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>
      )}

      <p className="text-xs text-gray-400">
        생성: {new Date(report.created_at).toLocaleString("ko-KR")}
        {report.completed_at && ` | 완료: ${new Date(report.completed_at).toLocaleString("ko-KR")}`}
      </p>
    </div>
  );
}
```

**Step 2: 대시보드 페이지 (app/dashboard/page.tsx)**

```typescript
// app/dashboard/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReportCard } from "@/components/ReportCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function DashboardContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">보고서 대시보드</h1>
          <Link href="/">
            <Button variant="outline">+ 새 보고서</Button>
          </Link>
        </div>

        {reportId ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-600">현재 분석 중인 보고서</h2>
            <ReportCard reportId={reportId} />
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📋</div>
            <p>아직 보고서가 없습니다.</p>
            <Link href="/">
              <Button className="mt-4">첫 보고서 만들기</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="text-center py-20">로딩 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
```

**Step 3: 빌드 + E2E 흐름 확인**

```bash
cd frontend && npm run build
# → 에러 없이 성공
npm run dev
# → http://localhost:3000 에서 랜딩 페이지 확인
# → URL 입력 후 대시보드로 리다이렉트 확인
```

**Step 4: Commit**

```bash
git add frontend/app/dashboard/ frontend/components/ReportCard.tsx
git commit -m "feat: add dashboard with real-time report status polling"
```

---

### Task 14: Docker Compose 통합 실행 환경

**Files:**
- Create: `~/business-validation-platform/docker-compose.yml`
- Create: `~/business-validation-platform/backend/Dockerfile`

**Step 1: docker-compose.yml**

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: bizvalidation
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:password@db:5432/bizvalidation
      REDIS_URL: redis://redis:6379/0
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:password@db:5432/bizvalidation
      REDIS_URL: redis://redis:6379/0
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    command: celery -A app.celery_app worker --loglevel=info -Q analysis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000

volumes:
  pgdata:
```

**Step 2: backend/Dockerfile**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium --with-deps
COPY . .
```

**Step 3: 통합 테스트 실행**

```bash
cd ~/business-validation-platform
docker-compose up -d db redis
# DB + Redis 실행 확인

cd backend
alembic upgrade head
# 테이블 생성 확인

# FastAPI 실행
uvicorn app.main:app --reload &

# Celery Worker 실행
celery -A app.celery_app worker --loglevel=info -Q analysis &

# E2E 테스트
curl -X POST http://localhost:8000/api/reports/create \
  -H "Content-Type: application/json" \
  -d '{"website_url":"https://example.com","industry":"법률 서비스","target_region":"서울","tier":"basic"}'
# → {"report_id": "...", "status": "pending", ...}
```

**Step 4: Commit**

```bash
git add docker-compose.yml backend/Dockerfile
git commit -m "feat: add Docker Compose for integrated development environment"
```

---

## Phase 2: 고급 기능 (Phase 1 완료 후)

> Phase 1 MVP 완료 후 이어서 진행

### Task 15: 콘텐츠 갭 분석 (Gap Analysis Agent)
- Playwright로 경쟁사 사이트맵/H태그 크롤링
- 우리 사이트 vs 경쟁사 토픽 비교
- Claude Haiku로 갭 주제 분류 및 우선순위

### Task 16: GBP 전략 Agent
- Google Maps에서 경쟁사 게시물 크롤링
- Claude Haiku로 패턴 분석 + 10개 템플릿 생성

### Task 17: 시장 조사 Agent (TAM/SAM/SOM)
- Claude Haiku로 업종별 시장 규모 추정
- 경쟁사 트래픽 기반 시장 점유율 추정

### Task 18: PDF 다운로드 (WeasyPrint)
- Markdown → HTML → PDF 변환
- `/api/reports/{id}/pdf` 엔드포인트

### Task 19: 보고서 미리보기 (Executive Summary)
- Executive Summary 섹션 추출 개선
- 검증 점수 계산 로직

---

## Phase 3: 상용화 (Phase 2 완료 후)

### Task 20: 사용자 인증 (NextAuth.js)
- 이메일 로그인 + Google OAuth
- JWT 세션 관리
- FastAPI 인증 미들웨어

### Task 21: Toss Payments 결제 시스템
- Tier별 결제 흐름
- 결제 완료 후 분석 시작 트리거
- 환불 정책 구현

### Task 22: 보고서 히스토리 대시보드
- 사용자별 보고서 목록
- 재다운로드 기능
- 분석 비교 기능

### Task 23: 성능 최적화
- Redis 캐싱 (동일 URL 재분석 방지)
- 병렬 크롤링 최적화
- Celery 작업 우선순위

### Task 24: 모니터링
- Sentry 에러 추적
- Celery Flower (작업 모니터링)
- 서비스 헬스체크 대시보드

---

## 검증 체크리스트

### Phase 1 완료 기준
- [ ] `http://localhost:8000/health` → `{"status": "ok"}`
- [ ] `POST /api/reports/create` → `status: "pending"` 반환
- [ ] Celery Worker가 태스크 수신 및 실행
- [ ] Playwright가 Google 검색 결과 크롤링 성공
- [ ] Claude Haiku API 호출 및 Markdown 보고서 생성
- [ ] `http://localhost:3000` 랜딩 페이지 렌더링
- [ ] URL 입력 → 대시보드 리다이렉트
- [ ] 대시보드에서 진행 상황 5초마다 폴링
- [ ] 완료 후 Markdown 다운로드 작동

### 전체 테스트 실행
```bash
cd backend && pytest tests/ -v
# → 모든 테스트 통과
```
