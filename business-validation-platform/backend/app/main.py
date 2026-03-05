import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import reports
from app.api.routes.payments import router as payments_router
from app.config import settings

sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )

app = FastAPI(title="Business Validation Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(payments_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/detailed")
async def health_detailed():
    """Detailed health check including Redis and DB status."""
    import redis as redis_lib

    status = {"api": "ok", "redis": "unknown", "database": "unknown"}

    # Check Redis
    try:
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        status["redis"] = "ok"
    except Exception as e:
        status["redis"] = f"error: {str(e)[:50]}"

    # Check DB
    try:
        from app.db import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        status["database"] = "ok"
    except Exception as e:
        status["database"] = f"error: {str(e)[:50]}"

    overall = "ok" if all(v == "ok" for v in status.values()) else "degraded"
    return {"status": overall, "services": status}
