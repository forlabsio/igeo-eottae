"""Tests for POST /api/reports/{report_id}/upload-plan endpoint."""
import uuid
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import get_db


FAKE_REPORT_ID = str(uuid.uuid4())


def _make_mock_db(report=None, existing_doc=None):
    """Build a mock AsyncSession for upload tests."""
    mock_db = AsyncMock()

    async def mock_get(model, pk):
        from app.models.models import Report
        if model is Report:
            return report
        return None

    mock_db.get = mock_get

    # mock_db.execute for BusinessPlanDocument select
    existing_result = MagicMock()
    existing_result.scalar_one_or_none.return_value = existing_doc
    mock_db.execute = AsyncMock(return_value=existing_result)

    mock_db.add = MagicMock()
    mock_db.delete = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    return mock_db


@pytest.mark.asyncio
async def test_upload_plan_404_unknown_report():
    """Returns 404 when report does not exist."""
    mock_db = _make_mock_db(report=None)

    async def override():
        yield mock_db

    app.dependency_overrides[get_db] = override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/reports/{FAKE_REPORT_ID}/upload-plan",
                files={"file": ("plan.txt", b"hello world", "text/plain")},
            )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_upload_plan_422_unsupported_type():
    """Returns 422 for unsupported file types."""
    from app.models.models import Report as ReportModel

    fake_report = MagicMock(spec=ReportModel)
    fake_report.id = uuid.UUID(FAKE_REPORT_ID)
    fake_report.industry = "IT"
    fake_report.target_region = "서울"

    mock_db = _make_mock_db(report=fake_report)

    async def override():
        yield mock_db

    app.dependency_overrides[get_db] = override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/reports/{FAKE_REPORT_ID}/upload-plan",
                files={"file": ("virus.exe", b"MZ\x90\x00", "application/exe")},
            )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_upload_plan_200_txt():
    """Returns 200 with completeness_score for valid TXT upload."""
    from app.models.models import Report as ReportModel

    fake_report = MagicMock(spec=ReportModel)
    fake_report.id = uuid.UUID(FAKE_REPORT_ID)
    fake_report.industry = "IT"
    fake_report.target_region = "서울"

    mock_db = _make_mock_db(report=fake_report, existing_doc=None)

    mock_analysis = {
        "completeness_score": 68,
        "swot": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
        "market_validity": {"score": 65, "summary": "양호", "key_risks": [], "key_opportunities": []},
        "execution_feasibility": {"score": 70, "summary": "실행 가능", "critical_gaps": [], "recommendations": []},
    }

    async def override():
        yield mock_db

    app.dependency_overrides[get_db] = override
    try:
        with patch(
            "app.agents.business_plan_analyzer.analyze_business_plan",
            new=AsyncMock(return_value=mock_analysis),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                txt_content = "# 사업계획서\n\n우리 회사는 혁신적인 서비스를 제공합니다.\n\n## 시장 분석\n시장 규모는 1조원입니다."
                response = await client.post(
                    f"/api/reports/{FAKE_REPORT_ID}/upload-plan",
                    files={"file": ("plan.txt", txt_content.encode(), "text/plain")},
                )
        assert response.status_code == 200
        body = response.json()
        assert body["file_type"] == "txt"
        assert body["completeness_score"] == 68
    finally:
        app.dependency_overrides.pop(get_db, None)