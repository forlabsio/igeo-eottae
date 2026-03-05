import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.orchestrator import _update_progress, run_analysis


@pytest.mark.asyncio
async def test_update_progress_handles_missing_report():
    """Should not raise if report doesn't exist"""
    with patch("app.agents.orchestrator.AsyncSessionLocal") as mock_session:
        mock_db = AsyncMock()
        mock_db.get.return_value = None  # Report not found
        mock_session.return_value.__aenter__.return_value = mock_db
        mock_session.return_value.__aexit__.return_value = AsyncMock(return_value=False)

        # Should not raise
        await _update_progress("00000000-0000-0000-0000-000000000000", 50)


@pytest.mark.asyncio
async def test_run_analysis_handles_missing_report():
    """Should exit gracefully if report not found"""
    with patch("app.agents.orchestrator.AsyncSessionLocal") as mock_session:
        mock_db = AsyncMock()
        mock_db.get.return_value = None  # Report not found
        mock_session.return_value.__aenter__.return_value = mock_db
        mock_session.return_value.__aexit__.return_value = AsyncMock(return_value=False)

        # Should not raise, just return
        await run_analysis("00000000-0000-0000-0000-000000000000")
