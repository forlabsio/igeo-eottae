from celery import Celery
from app.config import settings

celery_app = Celery(
    "bizvalidation",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_routes={
        "app.tasks.run_business_validation": {"queue": "analysis"},
    },
)
