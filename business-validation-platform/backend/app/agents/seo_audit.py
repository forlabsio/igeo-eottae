from typing import Dict, List, Any
from app.scrapers.playwright_utils import fetch_page_content, extract_schema_markup


async def audit_website(url: str) -> Dict[str, Any]:
    """웹사이트 SEO 기술 감사"""
    content = await fetch_page_content(url)
    if not content:
        return {
            "url": url,
            "error": "Failed to fetch",
            "schema_count": 0,
            "schema_types": [],
        }

    schemas = extract_schema_markup(content["html"])
    schema_types = [s.get("@type", "Unknown") for s in schemas]

    meta = content.get("meta", {})
    meta_score = sum([
        bool(content.get("title")),
        bool(meta.get("description")),
        bool(meta.get("keywords")),
    ]) / 3 * 100

    return {
        "url": url,
        "title": content["title"],
        "schema_count": len(schemas),
        "schema_types": schema_types,
        "schemas": schemas,
        "meta_completeness": round(meta_score),
        "headings_count": len(content.get("headings", [])),
    }


def compare_with_competitors(
    our_audit: Dict, competitor_audits: List[Dict]
) -> Dict[str, Any]:
    """우리 사이트 vs 경쟁사 비교 분석"""
    if not competitor_audits:
        return {
            "missing_schemas": [],
            "recommendations": [],
            "our_schema_count": our_audit.get("schema_count", 0),
            "avg_competitor_schema_count": 0,
        }

    competitor_schema_types: set = set()
    for audit in competitor_audits:
        competitor_schema_types.update(audit.get("schema_types", []))

    our_types = set(our_audit.get("schema_types", []))
    missing_schemas = list(competitor_schema_types - our_types)

    recommendations = []
    for schema_type in missing_schemas:
        count = sum(1 for a in competitor_audits if schema_type in a.get("schema_types", []))
        priority = "HIGH" if count >= len(competitor_audits) * 0.6 else "MEDIUM"
        recommendations.append({
            "schema_type": schema_type,
            "priority": priority,
            "competitor_usage": count,
        })

    recommendations.sort(
        key=lambda x: (x["priority"] == "HIGH", x["competitor_usage"]),
        reverse=True,
    )

    avg = sum(a.get("schema_count", 0) for a in competitor_audits) / len(competitor_audits)

    return {
        "missing_schemas": missing_schemas,
        "recommendations": recommendations,
        "our_schema_count": our_audit.get("schema_count", 0),
        "avg_competitor_schema_count": round(avg, 1),
    }
