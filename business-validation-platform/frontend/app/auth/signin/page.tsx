"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/dashboard" });
    setSent(true);
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#EEEAE3',
    padding: '12px 14px',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box' as const,
  };

  return (
    <main style={{ background: '#0B0C0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" stroke="#C9A96E" strokeWidth="1.5"/>
              <rect x="13" y="2" width="9" height="9" fill="#C9A96E" opacity="0.3" stroke="#C9A96E" strokeWidth="1.5"/>
              <rect x="2" y="13" width="9" height="9" fill="#C9A96E" opacity="0.15" stroke="#C9A96E" strokeWidth="1.5"/>
              <rect x="13" y="13" width="9" height="9" stroke="#C9A96E" strokeWidth="1.5"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, color: '#EEEAE3' }}>
            BizValidate
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#14161C',
          border: '1px solid rgba(201,169,110,0.15)',
          padding: '2.5rem',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Access Portal
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, color: '#EEEAE3', marginBottom: '0.25rem' }}>
            로그인
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#52535A', marginBottom: '2rem' }}>
            이메일 또는 Google 계정으로 접속하세요
          </p>

          <div className="gold-rule" style={{ marginBottom: '2rem' }} />

          {sent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.2)' }}>
              <p style={{ fontSize: '0.875rem', color: '#3DD68C' }}>이메일을 확인해주세요</p>
              <p style={{ fontSize: '0.75rem', color: '#52535A', marginTop: '0.5rem' }}>로그인 링크가 발송되었습니다</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(201,169,110,0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#C9A96E',
                    color: '#0B0C0F',
                    border: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? "발송 중..." : "이메일 링크 발송"}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.25rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#52535A', letterSpacing: '0.08em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              </div>

              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  color: '#9B9BA5',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#EEEAE3'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#9B9BA5'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 계속하기
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#52535A', marginTop: '1.5rem' }}>
          로그인 시 서비스 이용약관에 동의합니다
        </p>
      </div>
    </main>
  );
}
