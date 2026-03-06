import uuid
import json
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.models import Report, User, FinalReport, BusinessPlanDocument
from app.schemas.schemas import ReportCreate, ReportStatus, ReportDownload, ReportPreview, ReportListItem, ReportList, BusinessPlanUploadResponse
from app.tasks import run_business_validation
from app.utils.report_parser import extract_executive_summary, calculate_validation_score
from app.utils.doc_parser import detect_file_type, extract_text, DocParseError

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


@router.get("/", response_model=ReportList)
async def list_reports(
    user_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List reports, optionally filtered by user_id."""
    from sqlalchemy import func

    query = select(Report)
    count_query = select(func.count(Report.id))

    if user_id:
        query = query.where(Report.user_id == user_id)
        count_query = count_query.where(Report.user_id == user_id)

    query = query.order_by(Report.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    count_result = await db.execute(count_query)

    reports = result.scalars().all()
    total = count_result.scalar() or 0

    items = []
    for r in reports:
        items.append(ReportListItem(
            id=str(r.id),
            website_url=r.website_url,
            industry=r.industry,
            target_region=r.target_region,
            status=r.status,
            tier=r.tier,
            progress=r.progress,
            created_at=r.created_at.isoformat() if r.created_at else None,
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
        ))

    return ReportList(items=items, total=total)


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
            select(FinalReport).where(FinalReport.report_id == report_id).order_by(FinalReport.created_at.desc()).limit(1)
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
        select(FinalReport).where(FinalReport.report_id == report_id).order_by(FinalReport.created_at.desc()).limit(1)
    )
    final = result.scalar_one_or_none()
    if not final:
        raise HTTPException(status_code=404, detail="Report content not found")
    return PlainTextResponse(final.markdown_content, media_type="text/markdown")


@router.post("/{report_id}/upload-plan", response_model=BusinessPlanUploadResponse)
async def upload_business_plan(
    report_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a business plan document and run AI analysis on it."""
    from app.agents.business_plan_analyzer import analyze_business_plan

    # 1. Confirm report exists
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # 2. Detect file type
    try:
        file_type = detect_file_type(file.filename or "", file.content_type or "")
    except DocParseError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 3. Read file bytes
    raw_bytes = await file.read()

    # 4. Extract text
    try:
        extracted_text = extract_text(raw_bytes, file_type)
    except DocParseError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 5. AI analysis (non-fatal — continue even if it fails)
    analysis: dict = {}
    completeness_score = None
    analysis_summary = None
    try:
        analysis = await analyze_business_plan(
            extracted_text,
            industry=report.industry or "",
            region=report.target_region or "",
        )
        completeness_score = analysis.get("completeness_score")
        exec_summary = analysis.get("execution_feasibility", {}).get("summary", "")
        market_summary = analysis.get("market_validity", {}).get("summary", "")
        analysis_summary = exec_summary or market_summary or None
    except Exception:
        pass  # Non-fatal: proceed without analysis

    # 6. Delete existing document (idempotent re-upload)
    existing = await db.execute(
        select(BusinessPlanDocument).where(BusinessPlanDocument.report_id == report_id)
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        await db.delete(existing_doc)
        await db.flush()

    # 7. Save to DB
    doc = BusinessPlanDocument(
        report_id=report_id,
        filename=file.filename or "upload",
        file_type=file_type,
        extracted_text=extracted_text,
        analysis_json=json.dumps(analysis, ensure_ascii=False) if analysis else None,
    )
    db.add(doc)
    await db.commit()

    return BusinessPlanUploadResponse(
        report_id=str(report_id),
        filename=file.filename or "upload",
        file_type=file_type,
        completeness_score=completeness_score,
        analysis_summary=analysis_summary,
    )


@router.get("/{report_id}/pdf")
async def download_pdf(
    report_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Generate and return PDF of the report."""
    from app.utils.pdf_generator import generate_pdf_bytes

    result = await db.execute(
        select(FinalReport).where(FinalReport.report_id == report_id).order_by(FinalReport.created_at.desc()).limit(1)
    )
    final_report = result.scalar_one_or_none()
    if not final_report:
        raise HTTPException(status_code=404, detail="Report not found or not completed")

    pdf_bytes = await generate_pdf_bytes(final_report.markdown_content)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report-{report_id[:8]}.pdf"}
    )
