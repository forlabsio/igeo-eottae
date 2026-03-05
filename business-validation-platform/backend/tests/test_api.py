import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_get_nonexistent_report_status():
    """GET status of non-existent report returns 404"""
    with patch("app.api.routes.reports.get_db") as mock_get_db:
        mock_db = AsyncMock()
        mock_db.get.return_value = None
        mock_get_db.return_value.__aiter__ = MagicMock(return_value=iter([mock_db]))

        async def mock_dependency():
            yield mock_db

        app.dependency_overrides[__import__("app.db", fromlist=["get_db"]).get_db] = mock_dependency

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/reports/00000000-0000-0000-0000-000000000000/status")

        app.dependency_overrides.clear()

    assert response.status_code == 404
