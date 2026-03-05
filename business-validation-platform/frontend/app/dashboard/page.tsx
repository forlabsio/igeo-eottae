import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardContent } from "@/components/DashboardContent";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">보고서 대시보드</h1>
            <p className="text-gray-500 text-sm mt-1">
              AI 분석 진행 상황을 실시간으로 확인합니다
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">+ 새 보고서</Button>
          </Link>
        </div>

        <Suspense
          fallback={<div className="animate-pulse bg-gray-100 rounded-xl h-32" />}
        >
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
