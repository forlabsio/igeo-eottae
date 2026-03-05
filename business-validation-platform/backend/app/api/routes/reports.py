import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.models import Report, User, FinalReport
from app.schemas.schemas import ReportCreate, ReportStatus, ReportDownload, ReportPreview
from app.tasks import run_business_validation

router = APIRouter()


async def _get_or_create_guest_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == "guest@example.com"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email="guest@example.com", name="Guest")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@router.post("/create", response_model=ReportStatus)
async def create_report(body: ReportCreate, db: AsyncSession = Depends(get_db)):
    """Create a new validation report and queue analysis"""
    user = await _get_or_create_guest_user(db)

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

    # Queue the analysis task
    run_business_validation.delay(str(report.id))

    return ReportStatus(
        report_id=report.id,
        status=report.status,
        progress=report.progress,
        created_at=report.created_at,
        completed_at=report.completed_at,
    )


@router.get("/{report_id}/status", response_model=ReportStatus)
async def get_report_status(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportStatus(
        report_id=report.id,
        status=report.status,
        progress=report.progress,
        created_at=report.created_at,
        completed_at=report.completed_at,
    )


@router.get("/{report_id}/preview", response_model=ReportPreview)
async def preview_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    executive_summary = None
    if report.status == "completed":
        result = await db.execute(
            select(FinalReport).where(FinalReport.report_id == report_id)
        )
        final = result.scalar_one_or_none()
        if final and final.markdown_content:
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
            executive_summary = "\n".join(summary_lines[:20]).strip() or None

    return ReportPreview(
        report_id=report_id,
        status=report.status,
        executive_summary=executive_summary,
    )


@router.get("/{report_id}/download", response_model=ReportDownload)
async def download_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != "completed":
        raise HTTPException(status_code=400, detail=f"Report not ready: {report.status}")

    return ReportDownload(
        report_id=report_id,
        markdown_url=f"/api/reports/{report_id}/markdown",
        pdf_url=None,
    )


@router.get("/{report_id}/markdown")
async def get_markdown(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FinalReport).where(FinalReport.report_id == report_id)
    )
    final = result.scalar_one_or_none()
    if not final:
        raise HTTPException(status_code=404, detail="Report content not found")
    return PlainTextResponse(final.markdown_content, media_type="text/markdown")
