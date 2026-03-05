import asyncio
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.models import (
    Report, Competitor, Keyword, SEOAudit, FinalReport
)
from app.agents.competitor import discover_competitors
from app.agents.seo_audit import audit_website, compare_with_competitors
from app.agents.keywords import generate_intent_keywords
from app.agents.report_gen import generate_report


async def _update_progress(report_id: str, progress: int, status: str = "processing") -> None:
    """Update report progress in DB"""
    async with AsyncSessionLocal() as db:
        report = await db.get(Report, uuid.UUID(report_id))
        if report:
            report.progress = progress
            report.status = status
            await db.commit()


async def run_analysis(report_id: str) -> None:
    """Run full business validation analysis for a report"""
    print(f"[Orchestrator] Starting analysis for report {report_id}")

    async with AsyncSessionLocal() as db:
        report = await db.get(Report, uuid.UUID(report_id))
        if not report:
            print(f"[Orchestrator] Report {report_id} not found")
            return

        industry = report.industry or ""
        region = report.target_region or ""
        tier = report.tier or "basic"
        website_url = report.website_url

    try:
        # Step 1: Discover competitors (10%)
        await _update_progress(report_id, 10)

        tier_limits = {"basic": 3, "pro": 10, "premium": 20}
        max_competitors = tier_limits.get(tier, 3)

        competitors = await discover_competitors(
            industry=industry,
            region=region,
            max_results=max_competitors,
        )

        # Save competitors to DB
        async with AsyncSessionLocal() as db:
            for url in competitors:
                comp = Competitor(report_id=uuid.UUID(report_id), url=url)
                db.add(comp)
            await db.commit()

        await _update_progress(report_id, 20)

        # Step 2: Parallel analysis (20% -> 70%)
        our_audit_coro = audit_website(website_url)
        competitor_audit_coros = [audit_website(url) for url in competitors[:5]]

        all_audits = await asyncio.gather(
            our_audit_coro,
            *competitor_audit_coros,
            return_exceptions=True,
        )

        our_audit = all_audits[0] if not isinstance(all_audits[0], Exception) else {"schema_count": 0, "schema_types": []}
        competitor_audits = [
            a for a in all_audits[1:] if not isinstance(a, Exception)
        ]

        keywords = generate_intent_keywords(industry, region)

        await _update_progress(report_id, 50)

        # Step 3: SEO comparison
        seo_comparison = compare_with_competitors(our_audit, competitor_audits)

        # Save SEO audit to DB
        async with AsyncSessionLocal() as db:
            seo = SEOAudit(
                report_id=uuid.UUID(report_id),
                schema_count=our_audit.get("schema_count", 0),
                recommendations=seo_comparison.get("recommendations", []),
            )
            db.add(seo)

            # Save keywords to DB
            for kw in keywords[:20]:
                keyword = Keyword(
                    report_id=uuid.UUID(report_id),
                    keyword=kw["keyword"],
                    intent=kw["intent"],
                )
                db.add(keyword)

            await db.commit()

        await _update_progress(report_id, 70)

        # Step 4: Generate report (70% -> 90%)
        competitors_data = [
            {"url": url, "audit": audit}
            for url, audit in zip(competitors, competitor_audits)
        ]

        markdown = await generate_report(
            website_url=website_url,
            industry=industry,
            region=region,
            competitors=competitors_data,
            seo_comparison=seo_comparison,
            keywords=keywords[:20],
            content_gaps=[],
            market_data={"industry": industry, "region": region},
        )

        await _update_progress(report_id, 90)

        # Step 5: Save final report (90% -> 100%)
        async with AsyncSessionLocal() as db:
            final = FinalReport(
                report_id=uuid.UUID(report_id),
                markdown_content=markdown,
            )
            db.add(final)

            report = await db.get(Report, uuid.UUID(report_id))
            if report:
                report.status = "completed"
                report.progress = 100
                report.completed_at = datetime.utcnow()

            await db.commit()

        print(f"[Orchestrator] Report {report_id} completed successfully")

    except Exception as e:
        print(f"[Orchestrator] Report {report_id} FAILED: {e}")
        await _update_progress(report_id, 0, "failed")
        raise
