"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportItem {
  id: string;
  website_url: string;
  industry: string;
  target_region: string;
  status: string;
  tier: string;
  progress: number;
  created_at: string | null;
  completed_at: string | null;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "QUEUED", color: "#9B9BA5" },
  processing: { label: "ANALYZING", color: "#C9A96E" },
  completed: { label: "COMPLETE", color: "#3DD68C" },
  failed: { label: "FAILED", color: "#E05555" },
};

const TIER_LABELS: Record<string, string> = {
  basic: "Starter",
  pro: "Professional",
  premium: "Enterprise",
};

const LIMIT = 10;

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchReports = async (p: number) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8200";
      const res = await fetch(`${apiUrl}/api/reports/?limit=${LIMIT}&offset=${p * LIMIT}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.items);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(page); }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <main style={{ background: '#0B0C0F', minHeight: '100vh', paddingTop: '80px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Reports
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: '#EEEAE3', lineHeight: 1.1 }}>
              분석 히스토리
              {total > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#52535A', fontStyle: 'normal', marginLeft: '1rem' }}>
                  ({total})
                </span>
              )}
            </h1>
          </div>
          <Link href="/" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#0B0C0F',
            background: '#C9A96E',
            padding: '9px 20px',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}>
            + New Analysis
          </Link>
        </div>

        <div className="gold-rule" style={{ marginBottom: '0' }} />

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#52535A', letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', background: '#14161C', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#EEEAE3', marginBottom: '0.5rem' }}>
              보고서 없음
            </p>
            <p style={{ fontSize: '0.875rem', color: '#52535A', marginBottom: '2rem' }}>
              첫 번째 비즈니스 검증을 시작하세요
            </p>
            <Link href="/" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#0B0C0F',
              background: '#C9A96E',
              padding: '10px 24px',
              textDecoration: 'none',
            }}>
              첫 분석 시작
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 100px 120px 80px',
              gap: '1rem',
              padding: '0.625rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {["Website", "Industry", "Tier", "Date", "Status"].map((h) => (
                <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.1em' }}>
                  {h.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {reports.map((r, i) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px 120px 80px',
                    gap: '1rem',
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    alignItems: 'center',
                  }}
                >
                  {/* URL + actions */}
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#EEEAE3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                      {r.website_url.replace(/^https?:\/\//, '')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Link href={`/dashboard?id=${r.id}`} style={{ fontSize: '0.6875rem', color: '#C9A96E', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        View →
                      </Link>
                      {r.status === "completed" && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8200"}/api/reports/${r.id}/pdf`}
                          download
                          style={{ fontSize: '0.6875rem', color: '#9B9BA5', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                        >
                          PDF ↓
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Industry */}
                  <div style={{ fontSize: '0.75rem', color: '#9B9BA5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.industry}
                  </div>

                  {/* Tier */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.06em' }}>
                    {TIER_LABELS[r.tier] || r.tier}
                  </div>

                  {/* Date */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#52535A' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "—"}
                  </div>

                  {/* Status */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', color: meta.color }}>
                    {meta.label}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.5rem' }}>
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.08em',
                    color: page === 0 ? '#52535A' : '#C9A96E',
                    background: 'transparent',
                    border: `1px solid ${page === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(201,169,110,0.3)'}`,
                    padding: '7px 16px',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#52535A' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.08em',
                    color: page + 1 >= totalPages ? '#52535A' : '#C9A96E',
                    background: 'transparent',
                    border: `1px solid ${page + 1 >= totalPages ? 'rgba(255,255,255,0.06)' : 'rgba(201,169,110,0.3)'}`,
                    padding: '7px 16px',
                    cursor: page + 1 >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
