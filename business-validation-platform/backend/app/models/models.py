import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    reports = relationship("Report", back_populates="user")

class Report(Base):
    __tablename__ = "reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    website_url = Column(String(500), nullable=False)
    industry = Column(String(100))
    target_region = Column(String(100))
    status = Column(String(50), default="pending")
    progress = Column(Integer, default=0)
    tier = Column(String(50), default="basic")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="reports")
    competitors = relationship("Competitor", back_populates="report", cascade="all, delete-orphan")
    keywords = relationship("Keyword", back_populates="report", cascade="all, delete-orphan")
    content_gaps = relationship("ContentGap", back_populates="report", cascade="all, delete-orphan")
    seo_audits = relationship("SEOAudit", back_populates="report", cascade="all, delete-orphan")
    gbp_strategies = relationship("GBPStrategy", back_populates="report", cascade="all, delete-orphan")
    final_reports = relationship("FinalReport", back_populates="report", cascade="all, delete-orphan")

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    url = Column(String(500), nullable=False)
    domain_authority = Column(Integer, nullable=True)
    monthly_traffic = Column(Integer, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    report = relationship("Report", back_populates="competitors")

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    keyword = Column(String(255), nullable=False)
    search_volume = Column(Integer, nullable=True)
    difficulty = Column(String(50))
    cpc = Column(Numeric(10, 2), nullable=True)
    intent = Column(String(50))
    report = relationship("Report", back_populates="keywords")

class ContentGap(Base):
    __tablename__ = "content_gaps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    topic = Column(String(255), nullable=False)
    search_volume = Column(Integer, nullable=True)
    priority = Column(String(50))
    reason = Column(Text)
    report = relationship("Report", back_populates="content_gaps")

class SEOAudit(Base):
    __tablename__ = "seo_audits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    page_speed = Column(Numeric(5, 2), nullable=True)
    mobile_score = Column(Integer, nullable=True)
    schema_count = Column(Integer, nullable=True)
    recommendations = Column(JSON, default=list)
    report = relationship("Report", back_populates="seo_audits")

class GBPStrategy(Base):
    __tablename__ = "gbp_strategies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    posting_frequency = Column(String(100))
    content_types = Column(JSON, default=dict)
    cta_style = Column(String(255))
    templates = Column(JSON, default=list)
    report = relationship("Report", back_populates="gbp_strategies")

class FinalReport(Base):
    __tablename__ = "final_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    markdown_content = Column(Text)
    pdf_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="final_reports")

class BusinessPlanDocument(Base):
    __tablename__ = "business_plan_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, unique=True)
    filename = Column(Text, nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf|docx|md|txt
    extracted_text = Column(Text, nullable=False)
    analysis_json = Column(Text, nullable=True)     # JSON: SWOT + scores
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", backref="business_plan_document", uselist=False)
