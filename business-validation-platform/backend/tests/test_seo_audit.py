import pytest
from unittest.mock import AsyncMock, patch
from app.agents.seo_audit import audit_website, compare_with_competitors


@pytest.mark.asyncio
async def test_audit_website_extracts_schema():
    mock_content = {
        "url": "https://example.com",
        "title": "Test Site",
        "html": '<script type="application/ld+json">{"@type": "LocalBusiness"}</script>',
        "headings": [{"tag": "H1", "text": "Hello"}],
        "meta": {"description": "Test desc", "keywords": None},
    }
    with patch("app.agents.seo_audit.fetch_page_content", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_content
        result = await audit_website("https://example.com")
        assert result["schema_types"] == ["LocalBusiness"]
        assert result["schema_count"] == 1
        assert result["url"] == "https://example.com"


@pytest.mark.asyncio
async def test_audit_website_returns_error_on_fetch_failure():
    with patch("app.agents.seo_audit.fetch_page_content", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = None
        result = await audit_website("https://unreachable.example.com")
        assert result["error"] == "Failed to fetch"
        assert result["schema_count"] == 0


def test_compare_with_no_competitors():
    our_audit = {"schema_count": 1, "schema_types": ["LocalBusiness"]}
    result = compare_with_competitors(our_audit, [])
    assert result["missing_schemas"] == []
    assert result["recommendations"] == []


def test_compare_identifies_missing_schemas():
    our_audit = {"schema_count": 1, "schema_types": ["LocalBusiness"]}
    competitor_audits = [
        {"schema_count": 3, "schema_types": ["LocalBusiness", "FAQ", "Review"]},
        {"schema_count": 2, "schema_types": ["LocalBusiness", "FAQ"]},
    ]
    result = compare_with_competitors(our_audit, competitor_audits)
    assert "FAQ" in result["missing_schemas"]
    assert "Review" in result["missing_schemas"]
    assert "LocalBusiness" not in result["missing_schemas"]


def test_compare_high_priority_for_widely_used_schemas():
    our_audit = {"schema_count": 0, "schema_types": []}
    competitor_audits = [
        {"schema_count": 2, "schema_types": ["FAQ", "Review"]},
        {"schema_count": 2, "schema_types": ["FAQ", "Review"]},
        {"schema_count": 1, "schema_types": ["FAQ"]},
    ]
    result = compare_with_competitors(our_audit, competitor_audits)
    faq_rec = next(r for r in result["recommendations"] if r["schema_type"] == "FAQ")
    assert faq_rec["priority"] == "HIGH"  # 3/3 = 100% > 60%
