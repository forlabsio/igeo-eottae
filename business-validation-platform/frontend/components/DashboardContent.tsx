"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ReportCard } from "@/components/ReportCard";

export function DashboardContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id");

  if (!reportId) {
    return (
      <div style={{
        background: '#14161C',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '1px solid rgba(201,169,110,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4h12M4 8h12M4 12h8" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: '#EEEAE3', marginBottom: '0.5rem' }}>
          보고서 없음
        </p>
        <p style={{ fontSize: '0.875rem', color: '#52535A', marginBottom: '2rem' }}>
          분석을 시작하여 첫 보고서를 생성하세요
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#0B0C0F',
          background: '#C9A96E',
          padding: '10px 24px',
          textDecoration: 'none',
        }}>
          분석 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#52535A', letterSpacing: '0.06em', marginBottom: '1rem' }}>
        REPORT ID: {reportId}
      </div>
      <ReportCard reportId={reportId} />
    </div>
  );
}
