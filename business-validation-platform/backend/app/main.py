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
