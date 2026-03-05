import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import get_db


def make_mock_db_with_reports(reports, total):
    """Create a mock DB session that returns given reports and total count."""
    mock_db = AsyncMock()

    mock_main_result = MagicMock()
    mock_main_result.scalars.return_value.all.return_value = reports

    mock_count_result = MagicMock()
    mock_count_result.scalar.return_value = total

    call_count = [0]

    async def mock_execute(query, *args, **kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            return mock_main_result
        return mock_count_result

    mock_db.execute = mock_execute
    return mock_db


@pytest.mark.asyncio
async def test_list_reports_returns_empty():
    """When DB has no reports, returns empty list."""
    mock_db = make_mock_db_with_reports([], 0)

    async def mock_dependency():
        yield mock_db

    app.dependency_overrides[get_db] = mock_dependency

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/reports/")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_reports_limit_parameter():
    """limit parameter is accepted."""
    mock_db = make_mock_db_with_reports([], 0)

    async def mock_dependency():
        yield mock_db

    app.dependency_overrides[get_db] = mock_dependency

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/reports/?limit=5")

    app.dependency_overrides.clear()

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_reports_offset_parameter():
    """offset parameter is accepted."""
    mock_db = make_mock_db_with_reports([], 0)

    async def mock_dependency():
        yield mock_db

    app.dependency_overrides[get_db] = mock_dependency

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/reports/?offset=10")

    app.dependency_overrides.clear()

    assert response.status_code == 200
