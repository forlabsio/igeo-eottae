# Business Validation Platform

AI 기반 비즈니스 검증 플랫폼. URL 입력 → 경쟁사 자동 발굴 → 맥킨지 스타일 보고서 생성.

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Anthropic API key

### Run

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

docker-compose up -d
```

Open http://localhost:3000

### Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # set ANTHROPIC_API_KEY

# Terminal 1: FastAPI
uvicorn app.main:app --reload --port 8000

# Terminal 2: Celery Worker
celery -A app.celery_app worker --loglevel=info -Q analysis
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack
- **Frontend**: Next.js 16 + TailwindCSS + shadcn/ui
- **Backend**: FastAPI + Celery + Redis
- **AI**: Claude Haiku (claude-haiku-4-5-20251001)
- **Scraping**: Playwright (Chromium)
- **DB**: PostgreSQL + SQLAlchemy
