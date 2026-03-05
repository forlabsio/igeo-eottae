"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ReportItem {
  id: string
  website_url: string
  industry: string
  target_region: string
  status: string
  tier: string
  progress: number
  created_at: string | null
  completed_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기 중",
  processing: "분석 중",
  completed: "완료",
  failed: "실패",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  processing: "default",
  completed: "default",
  failed: "destructive",
}

const TIER_LABELS: Record<string, string> = {
  basic: "빠른 검증",
  pro: "심층 분석",
  premium: "전략+실행",
}

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const LIMIT = 10

  const fetchReports = async (pageNum: number) => {
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(
        `${apiUrl}/api/reports/?limit=${LIMIT}&offset=${pageNum * LIMIT}`
      )
      if (res.ok) {
        const data = await res.json()
        setReports(data.items)
        setTotal(data.total)
      }
    } catch (e) {
      console.error("Failed to fetch reports:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(page)
  }, [page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">분석 히스토리</h1>
        <Link href="/">
          <Button variant="outline">새 분석 시작</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">아직 분석 기록이 없습니다.</p>
            <Link href="/">
              <Button>첫 분석 시작하기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium truncate max-w-sm">
                      {report.website_url}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {report.industry} · {report.target_region}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={STATUS_COLORS[report.status] as any || "default"}>
                      {STATUS_LABELS[report.status] || report.status}
                    </Badge>
                    <Badge variant="outline">{TIER_LABELS[report.tier] || report.tier}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {report.created_at
                      ? new Date(report.created_at).toLocaleString("ko-KR")
                      : "-"}
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/dashboard?id=${report.id}`}>
                      <Button size="sm" variant="outline">상세 보기</Button>
                    </Link>
                    {report.status === "completed" && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/reports/${report.id}/pdf`}
                        download
                      >
                        <Button size="sm">PDF 다운로드</Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                이전
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
