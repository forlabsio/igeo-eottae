"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  "법률 서비스", "의료/병원", "치과", "헬스장/피트니스", "카페/음식점",
  "부동산", "학원/교육", "미용실/뷰티", "세무/회계", "IT 서비스",
  "쇼핑몰", "건설/인테리어", "여행/관광", "자동차 서비스", "반려동물",
];

const TIERS = [
  {
    id: "basic",
    name: "빠른 검증",
    price: "₩99,000",
    desc: "경쟁사 3개 · 20페이지",
  },
  {
    id: "pro",
    name: "심층 분석 ⭐",
    price: "₩299,000",
    desc: "경쟁사 10개 · 50페이지 + PDF",
  },
  {
    id: "premium",
    name: "전략+실행",
    price: "₩999,000",
    desc: "경쟁사 20개 · 100페이지",
  },
];

export function UrlInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [tier, setTier] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !industry) {
      setError("웹사이트 URL과 업종을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/reports/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: url,
          industry,
          target_region: region || undefined,
          tier,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "보고서 생성 실패");
      }

      const data = await res.json();
      router.push(`/dashboard?id=${(data as { report_id: string }).report_id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-2xl p-8 shadow-xl max-w-2xl mx-auto"
    >
      <div className="space-y-2">
        <Label htmlFor="url">웹사이트 URL *</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label>업종 *</Label>
        <Select onValueChange={setIndustry} required>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="업종을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">타겟 지역 (선택)</Label>
        <Input
          id="region"
          placeholder="서울, 강남, 부산 등"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="h-12"
        />
      </div>

      <div className="space-y-3">
        <Label>분석 패키지</Label>
        <div className="grid grid-cols-3 gap-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                tier === t.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-blue-600 font-bold mt-1">{t.price}</div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={loading}
      >
        {loading ? "분석 요청 중..." : "🚀 24시간 내 검증 시작"}
      </Button>

      <p className="text-center text-xs text-gray-400">
        공개 데이터만 수집합니다. 개인정보 수집 없음.
      </p>
    </form>
  );
}
