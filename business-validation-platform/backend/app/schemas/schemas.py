from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ReportCreate(BaseModel):
    website_url: str
    industry: str
    target_region: Optional[str] = None
    competitors: Optional[List[str]] = None
    tier: str = "basic"


class ReportStatus(BaseModel):
    report_id: uuid.UUID
    status: str
    progress: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReportDownload(BaseModel):
    report_id: uuid.UUID
    markdown_url: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: Optional[datetime] = None


class ReportPreview(BaseModel):
    report_id: uuid.UUID
    status: str
    validation_score: Optional[Dict[str, Any]] = None
    executive_summary: Optional[str] = None
