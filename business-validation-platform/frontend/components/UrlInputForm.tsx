"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  "법률 서비스", "의료/병원", "치과", "헬스장/피트니스", "카페/음식점",
  "부동산", "학원/교육", "미용실/뷰티", "세무/회계", "IT 서비스",
  "쇼핑몰", "건설/인테리어", "여행/관광", "자동차 서비스", "반려동물",
];

const TIERS = [
  { id: "basic", label: "Starter", price: "₩99,000", detail: "3개 경쟁사 · 20p" },
  { id: "pro", label: "Pro", price: "₩299,000", detail: "10개 경쟁사 · 50p + PDF" },
  { id: "premium", label: "Enterprise", price: "₩999,000", detail: "20개 경쟁사 · 100p" },
];

export function UrlInputForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [tier, setTier] = useState("basic");
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("분석 요청 중...");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!url || !industry) {
      setError("웹사이트 URL과 업종을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8200";

      // Step 1: Create report
      setLoadingText("분석 요청 중...");
      const res = await fetch(`${apiUrl}/api/reports/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: url, industry, target_region: region || undefined, tier }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "보고서 생성 실패");
      }
      const data = await res.json() as { report_id: string };
      const reportId = data.report_id;

      // Step 2: Upload business plan if provided (non-fatal)
      if (planFile) {
        setLoadingText("사업계획서 분석 중...");
        try {
          const formData = new FormData();
          formData.append("file", planFile);
          await fetch(`${apiUrl}/api/reports/${reportId}/upload-plan`, {
            method: "POST",
            body: formData,
          });
        } catch {
          // Non-fatal: warn in console, continue to dashboard
          console.warn("사업계획서 업로드 실패, 대시보드로 계속 진행합니다.");
        }
      }

      router.push(`/dashboard?id=${reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#EEEAE3',
    padding: '11px 14px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'var(--font-sans)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.6875rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#52535A',
    marginBottom: '6px',
    fontFamily: 'var(--font-mono)',
  };

  return (
    <div id="form" style={{
      background: '#14161C',
      border: '1px solid rgba(201,169,110,0.2)',
      padding: '2.5rem',
      maxWidth: '640px',
    }}>
      {/* Form header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          START ANALYSIS
        </div>
        <div className="gold-rule" />
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* URL Field */}
          <div>
            <label style={labelStyle}>Website URL *</label>
            <input
              type="url"
              placeholder="https://yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(201,169,110,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
          </div>

          {/* Two columns: Industry + Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>업종 *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23C9A96E'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '32px',
                }}
              >
                <option value="" disabled style={{ background: '#14161C' }}>선택</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i} style={{ background: '#14161C' }}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>타겟 지역</label>
              <input
                type="text"
                placeholder="서울, 강남, 부산 등"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(201,169,110,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>
          </div>

          {/* Tier Selection */}
          <div>
            <label style={labelStyle}>분석 패키지</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left' as const,
                    background: tier === t.id ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)',
                    border: tier === t.id ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: tier === t.id ? '#C9A96E' : '#52535A', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {t.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: '#EEEAE3', lineHeight: 1 }}>
                    {t.price}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#9B9BA5', marginTop: '3px' }}>
                    {t.detail}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Business Plan Upload */}
          <div>
            <label style={labelStyle}>사업계획서 첨부 <span style={{ color: '#52535A', fontWeight: 400 }}>(선택)</span></label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '16px 14px',
                border: planFile ? '1px solid rgba(201,169,110,0.5)' : '1px dashed rgba(255,255,255,0.15)',
                background: planFile ? 'rgba(201,169,110,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1rem', color: planFile ? '#C9A96E' : '#52535A' }}>
                {planFile ? '📄' : '＋'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: planFile ? '#C9A96E' : '#52535A' }}>
                {planFile ? planFile.name : 'PDF · DOCX · MD · TXT (최대 10MB)'}
              </span>
              {planFile && (
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setPlanFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52535A', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                  aria-label="파일 제거"
                >
                  ×
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPlanFile(f);
              }}
            />
            {planFile && (
              <p style={{ fontSize: '0.6875rem', color: '#52535A', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
                AI가 SWOT · 시장 타당성 · 완성도 점수 · 실행 가능성을 분석합니다
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: '0.8125rem', color: '#E05555', background: 'rgba(224,85,85,0.08)', border: '1px solid rgba(224,85,85,0.2)', padding: '10px 14px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: loading ? 'rgba(201,169,110,0.5)' : '#C9A96E',
              color: '#0B0C0F',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? loadingText : "분석 시작하기 →"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#52535A', margin: 0 }}>
            공개 데이터만 수집 · 개인정보 미취급
          </p>
        </div>
      </form>
    </div>
  );
}
