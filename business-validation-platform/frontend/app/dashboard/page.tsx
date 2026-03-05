import { Suspense } from "react";
import Link from "next/link";
import { DashboardContent } from "@/components/DashboardContent";

export default function DashboardPage() {
  return (
    <main style={{ background: '#0B0C0F', minHeight: '100vh', paddingTop: '80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Report Dashboard
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: '#EEEAE3', lineHeight: 1.1 }}>
              분석 현황
            </h1>
          </div>
          <Link href="/" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#C9A96E',
            border: '1px solid rgba(201,169,110,0.3)',
            padding: '7px 16px',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}>
            + New Report
          </Link>
        </div>

        <div className="gold-rule" style={{ marginBottom: '2.5rem' }} />

        <Suspense fallback={
          <div style={{
            background: '#14161C',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '3rem',
            textAlign: 'center',
            color: '#52535A',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
          }}>
            LOADING...
          </div>
        }>
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
