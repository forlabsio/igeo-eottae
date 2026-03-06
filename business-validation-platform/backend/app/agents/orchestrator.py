import asyncio
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.models import (
    Report, Competitor, Keyword, SEOAudit, FinalReport, BusinessPlanDocument
)
from app.agents.competitor import discover_competitors
from app.agents.seo_audit import audit_website, compare_with_competitors
from app.agents.keywords import generate_intent_keywords
from app.agents.report_gen import generate_report
from app.agents.gap_analysis import analyze_content_gap
from app.agents.market_research import estimate_market_size
from app.agents.gbp_strategy import generate_gbp_strategy
from app.utils.cache import get_cached_analysis, set_cached_analysis


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
        # Check cache before running full analysis
        cached = get_cached_analysis(website_url, industry, region)
        if cached and "markdown" in cached:
            print(f"[Orchestrator] Cache hit for {website_url}, skipping analysis")
            await _update_progress(report_id, 90, "processing")
            async with AsyncSessionLocal() as db:
                final = FinalReport(
                    report_id=uuid.UUID(report_id),
                    markdown_content=cached["markdown"],
                )
                db.add(final)

                report = await db.get(Report, uuid.UUID(report_id))
                if report:
                    report.status = "completed"
                    report.progress = 100
                    report.completed_at = datetime.utcnow()

                await db.commit()

            await _update_progress(report_id, 100, "completed")
            print(f"[Orchestrator] Report {report_id} completed from cache")
            return

        # Step 1: Discover competitors (10%)
        await _update_progress(report_id, 10)

        tier_limits = {"basic": 10, "pro": 20}
        max_competitors = tier_limits.get(tier, 10)

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

        # Run gap analysis, market research, and GBP strategy in parallel
        competitors_data_simple = [{"url": url} for url in competitors[:5]]
        gap_coro = analyze_content_gap(website_url, competitors[:5])
        market_coro = estimate_market_size(industry, region)
        gbp_coro = generate_gbp_strategy(industry, region, competitors_data_simple)

        gap_results, market_data, gbp_data = await asyncio.gather(
            gap_coro, market_coro, gbp_coro, return_exceptions=True
        )

        # Normalize results in case of exceptions
        if isinstance(gap_results, Exception):
            gap_results = []
        if isinstance(market_data, Exception):
            market_data = {"industry": industry, "region": region}
        if isinstance(gbp_data, Exception):
            gbp_data = {}

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

        # Load business plan context if available
        business_plan_context = None
        async with AsyncSessionLocal() as db:
            bp_result = await db.execute(
                select(BusinessPlanDocument).where(
                    BusinessPlanDocument.report_id == uuid.UUID(report_id)
                )
            )
            bp_doc = bp_result.scalar_one_or_none()
            if bp_doc and bp_doc.analysis_json:
                import json
                try:
                    business_plan_context = json.loads(bp_doc.analysis_json)
                except Exception:
                    pass

        # Step 4: Generate report (70% -> 90%)
        competitors_data = [
            {"url": url, "audit": audit}
            for url, audit in zip(competitors, competitor_audits)
        ]

        keyword_limit = 50 if tier == "pro" else 30
        gap_limit = 20 if tier == "pro" else 10

        markdown = await generate_report(
            website_url=website_url,
            industry=industry,
            region=region,
            tier=tier,
            competitors=competitors_data,
            seo_comparison=seo_comparison,
            keywords=keywords[:keyword_limit],
            content_gaps=(gap_results if isinstance(gap_results, list) else [])[:gap_limit],
            market_data=market_data if isinstance(market_data, dict) else {"industry": industry, "region": region},
            business_plan_context=business_plan_context,
        )

        await _update_progress(report_id, 90)

        # Cache the generated markdown for future requests
        set_cached_analysis(website_url, industry, region, {"markdown": markdown})

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
