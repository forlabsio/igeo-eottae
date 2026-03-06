"use client";
import { useEffect, useState, useCallback } from "react";

interface ReportStatus {
  report_id: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "QUEUED", color: "#9B9BA5", bg: "rgba(155,155,165,0.08)" },
  processing: { label: "ANALYZING", color: "#C9A96E", bg: "rgba(201,169,110,0.08)" },
  completed: { label: "COMPLETE", color: "#3DD68C", bg: "rgba(61,214,140,0.08)" },
  failed: { label: "FAILED", color: "#E05555", bg: "rgba(224,85,85,0.08)" },
};

const ANALYSIS_STAGES = [
  "경쟁사 발굴 중",
  "SEO 감사 실행 중",
  "키워드 리서치 중",
  "시장 규모 분석 중",
  "GBP 전략 수립 중",
  "보고서 생성 중",
];

export function ReportCard({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [preview, setPreview] = useState<{ executive_summary?: string; validation_score?: { total: number; grade: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8200";

  const currentStage = report ? Math.min(Math.floor((report.progress / 100) * ANALYSIS_STAGES.length), ANALYSIS_STAGES.length - 1) : 0;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/reports/${reportId}/status`);
      if (!res.ok) { setError("보고서를 불러올 수 없습니다."); return; }
      const data: ReportStatus = await res.json();
      setReport(data);

      if (data.status === "completed" && !preview) {
        const pr = await fetch(`${apiUrl}/api/reports/${reportId}/preview`);
        if (pr.ok) setPreview(await pr.json());
      }
    } catch {
      setError("서버 연결 실패");
    }
  }, [reportId, apiUrl, preview]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => {
    if (report?.status === "completed" || report?.status === "failed") return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [report?.status, fetchStatus]);

  const handleDownload = async (type: "markdown" | "pdf") => {
    const endpoint = type === "markdown" ? `/api/reports/${reportId}/markdown` : `/api/reports/${reportId}/pdf`;
    const res = await fetch(`${apiUrl}${endpoint}`);
    if (!res.ok) return alert("다운로드 실패");

    if (type === "markdown") {
      const text = await res.text();
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report-${reportId.slice(0,8)}.md`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report-${reportId.slice(0,8)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (error) return (
    <div style={{ background: 'rgba(224,85,85,0.08)', border: '1px solid rgba(224,85,85,0.2)', padding: '1.5rem', color: '#E05555', fontSize: '0.875rem' }}>
      {error}
    </div>
  );

  if (!report) return (
    <div style={{ background: '#14161C', border: '1px solid rgba(255,255,255,0.06)', padding: '3rem', textAlign: 'center', color: '#52535A', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', animation: 'pulse 2s infinite' }}>
      LOADING...
    </div>
  );

  const statusMeta = STATUS_META[report.status] || STATUS_META.pending;

  return (
    <div style={{ background: '#14161C', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Status header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#52535A', letterSpacing: '0.06em' }}>
          #{report.report_id.slice(0, 8).toUpperCase()}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          letterSpacing: '0.12em',
          color: statusMeta.color,
          background: statusMeta.bg,
          border: `1px solid ${statusMeta.color}33`,
          padding: '4px 10px',
        }}>
          {statusMeta.label}
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {/* Processing state */}
        {report.status === "processing" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.8125rem', color: '#9B9BA5' }}>
                {ANALYSIS_STAGES[currentStage]}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 600, color: '#C9A96E', lineHeight: 1 }}>
                {report.progress}%
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', position: 'relative', marginBottom: '1.25rem' }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${report.progress}%`,
                background: 'linear-gradient(90deg, #C9A96E, #E8D09A)',
                transition: 'width 1s ease',
              }} />
            </div>

            {/* Stage indicators */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem' }}>
              {ANALYSIS_STAGES.map((stage, i) => (
                <div
                  key={stage}
                  title={stage}
                  style={{
                    flex: 1,
                    height: '3px',
                    background: i < currentStage ? '#C9A96E' : i === currentStage ? 'rgba(201,169,110,0.5)' : 'rgba(255,255,255,0.06)',
                    transition: 'background 0.5s',
                  }}
                />
              ))}
            </div>

            <p style={{ fontSize: '0.75rem', color: '#52535A' }}>
              5초마다 자동 업데이트됩니다
            </p>
          </div>
        )}

        {/* Pending state */}
        {report.status === "pending" && (
          <div style={{ padding: '1.5rem 0' }}>
            <p style={{ fontSize: '0.875rem', color: '#9B9BA5' }}>분석 큐에서 대기 중입니다...</p>
          </div>
        )}

        {/* Completed state */}
        {report.status === "completed" && (
          <div>
            {/* Validation score */}
            {preview?.validation_score && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#1A1C24', border: '1px solid rgba(201,169,110,0.15)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.1em', marginBottom: '4px' }}>VALIDATION SCORE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 600, color: '#C9A96E', lineHeight: 1 }}>
                    {preview.validation_score.total}
                    <span style={{ fontSize: '1rem', color: '#9B9BA5', fontWeight: 400 }}>/100</span>
                  </div>
                </div>
                <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.07)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.1em', marginBottom: '4px' }}>GRADE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 600, color: '#3DD68C', lineHeight: 1 }}>
                    {preview.validation_score.grade}
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            {preview?.executive_summary && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#C9A96E', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  EXECUTIVE SUMMARY
                </div>
                <div style={{ borderLeft: '2px solid rgba(201,169,110,0.3)', paddingLeft: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#9B9BA5', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                    {preview.executive_summary}
                  </p>
                </div>
              </div>
            )}

            <div className="gold-rule" style={{ marginBottom: '1.25rem' }} />

            {/* Download buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDownload("markdown")}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#C9A96E',
                  color: '#0B0C0F',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Markdown ↓
              </button>
              <button
                onClick={() => handleDownload("pdf")}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  color: '#C9A96E',
                  border: '1px solid rgba(201,169,110,0.35)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(201,169,110,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                PDF ↓
              </button>
            </div>
          </div>
        )}

        {/* Failed state */}
        {report.status === "failed" && (
          <div style={{ padding: '1.5rem', background: 'rgba(224,85,85,0.06)', border: '1px solid rgba(224,85,85,0.15)' }}>
            <p style={{ fontSize: '0.875rem', color: '#E05555', marginBottom: '0.25rem' }}>분석 중 오류가 발생했습니다.</p>
            <p style={{ fontSize: '0.75rem', color: '#52535A' }}>새 보고서를 생성하여 다시 시도해주세요.</p>
          </div>
        )}

        {/* Timestamp */}
        <p style={{ fontSize: '0.6875rem', color: '#52535A', fontFamily: 'var(--font-mono)', marginTop: '1.25rem' }}>
          Created {new Date(report.created_at).toLocaleString("ko-KR")}
          {report.completed_at && ` · Completed ${new Date(report.completed_at).toLocaleString("ko-KR")}`}
        </p>
      </div>
    </div>
  );
}
