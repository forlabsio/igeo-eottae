"use client";
import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ReportStatus {
  report_id: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기 중",
  processing: "분석 중",
  completed: "완료",
  failed: "실패",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function ReportCard({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/reports/${reportId}/status`);
      if (!res.ok) {
        setFetchError("보고서를 불러올 수 없습니다.");
        return;
      }
      const data: ReportStatus = await res.json();
      setReport(data);

      if (data.status === "completed" && !preview) {
        const previewRes = await fetch(`${apiUrl}/api/reports/${reportId}/preview`);
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          setPreview(previewData.executive_summary || null);
        }
      }
    } catch {
      setFetchError("서버에 연결할 수 없습니다.");
    }
  }, [reportId, apiUrl, preview]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (report?.status === "completed" || report?.status === "failed") return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [report?.status, fetchStatus]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/reports/${reportId}/markdown`);
      if (!res.ok) throw new Error("다운로드 실패");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `business-report-${reportId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("다운로드에 실패했습니다.");
    }
  };

  if (fetchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
        {fetchError}
      </div>
    );
  }

  if (!report) {
    return <div className="animate-pulse bg-gray-100 rounded-xl h-32" />;
  }

  const statusColor = STATUS_COLORS[report.status] || "bg-gray-100 text-gray-700";
  const statusLabel = STATUS_LABELS[report.status] || report.status;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-mono">
          ID: {report.report_id.slice(0, 8)}...
        </span>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {report.status === "processing" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>AI 분석 진행 중...</span>
            <span className="font-semibold">{report.progress}%</span>
          </div>
          <Progress value={report.progress} className="h-2" />
          <p className="text-xs text-gray-400">
            경쟁사 크롤링 → SEO 감사 → 보고서 생성 순서로 진행됩니다
          </p>
        </div>
      )}

      {report.status === "pending" && (
        <p className="text-sm text-gray-500">분석 큐에서 대기 중입니다...</p>
      )}

      {report.status === "completed" && (
        <div className="space-y-4">
          {preview && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto border">
              <p className="font-semibold text-gray-900 mb-2">Executive Summary</p>
              {preview}
            </div>
          )}
          <Button onClick={handleDownload} className="w-full">
            📥 Markdown 보고서 다운로드
          </Button>
        </div>
      )}

      {report.status === "failed" && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600 text-sm font-medium">
            분석 중 오류가 발생했습니다.
          </p>
          <p className="text-red-500 text-xs mt-1">
            다시 시도하려면 새 보고서를 생성해주세요.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400">
        생성:{" "}
        {new Date(report.created_at).toLocaleString("ko-KR")}
        {report.completed_at &&
          ` | 완료: ${new Date(report.completed_at).toLocaleString("ko-KR")}`}
      </p>
    </div>
  );
}
