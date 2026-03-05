"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/ReportCard";

export function DashboardContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  if (!reportId) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg font-medium">아직 보고서가 없습니다.</p>
        <p className="text-sm mt-2 mb-6">웹사이트 URL을 입력하여 첫 보고서를 만들어보세요.</p>
        <Link href="/">
          <Button>첫 보고서 만들기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">현재 분석 중인 보고서</h2>
      <ReportCard reportId={reportId} />
    </div>
  );
}
