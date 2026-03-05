from app.celery_app import celery_app
import asyncio


@celery_app.task(bind=True, name="app.tasks.run_business_validation")
def run_business_validation(self, report_id: str):
    """Business validation analysis task - runs in Celery worker"""
    from app.agents.orchestrator import run_analysis
    asyncio.run(run_analysis(report_id))
