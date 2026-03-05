import uuid
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.models import Report, User, FinalReport
from app.schemas.schemas import ReportCreate, ReportStatus, ReportDownload, ReportPreview
from app.tasks import run_business_validation
from app.utils.report_parser import extract_executive_summary, calculate_validation_score

router = APIRouter()

_UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


async def get_optional_user_id(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """Extract user ID from Authorization header if present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    # In production, verify JWT here. For now, return a placeholder.
    token = authorization.split(" ", 1)[1]
    # Simple: use token as user_id if it looks like a UUID
    if _UUID_PATTERN.match(token):
        return token
    return None


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
async def create_report(
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_optional_user_id),
):
    """Create a new validation report and queue analysis"""
    if auth_user_id:
        resolved_user_id = uuid.UUID(auth_user_id)
    else:
        user = await _get_or_create_guest_user(db)
        resolved_user_id = user.id

    report = Report(
        user_id=resolved_user_id,
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
    validation_score = None
    if report.status == "completed":
        result = await db.execute(
            select(FinalReport).where(FinalReport.report_id == report_id)
        )
        final = result.scalar_one_or_none()
        if final and final.markdown_content:
            executive_summary = extract_executive_summary(final.markdown_content)
            validation_score = calculate_validation_score(final.markdown_content)

    return ReportPreview(
        report_id=report_id,
        status=report.status,
        executive_summary=executive_summary,
        validation_score=validation_score,
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


@router.get("/{report_id}/pdf")
async def download_pdf(
    report_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Generate and return PDF of the report."""
    from app.utils.pdf_generator import generate_pdf_bytes

    result = await db.execute(
        select(FinalReport).where(FinalReport.report_id == report_id)
    )
    final_report = result.scalar_one_or_none()
    if not final_report:
        raise HTTPException(status_code=404, detail="Report not found or not completed")

    pdf_bytes = generate_pdf_bytes(final_report.markdown_content)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report-{report_id[:8]}.pdf"}
    )
