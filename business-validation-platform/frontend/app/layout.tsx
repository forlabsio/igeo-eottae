import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Link from "next/link";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BizValidate — AI 비즈니스 검증 플랫폼",
  description: "맥킨지 스타일 전략 보고서를 24시간 내 자동 생성. AI 기반 경쟁사 분석 및 시장 검증 플랫폼.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="noise">
        {/* Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(11, 12, 15, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201, 169, 110, 0.12)' }}>
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-6 h-6 relative">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <rect x="2" y="2" width="9" height="9" stroke="#C9A96E" strokeWidth="1.5"/>
                  <rect x="13" y="2" width="9" height="9" fill="#C9A96E" opacity="0.3" stroke="#C9A96E" strokeWidth="1.5"/>
                  <rect x="2" y="13" width="9" height="9" fill="#C9A96E" opacity="0.15" stroke="#C9A96E" strokeWidth="1.5"/>
                  <rect x="13" y="13" width="9" height="9" stroke="#C9A96E" strokeWidth="1.5"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 500, color: '#EEEAE3', letterSpacing: '0.02em' }}>
                BizValidate
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-8">
              <Link
                href="/history"
                style={{ fontSize: '0.8125rem', color: '#9B9BA5', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.2s' }}
                className="hover:text-[#C9A96E]"
              >
                Reports
              </Link>
              <Link
                href="/auth/signin"
                style={{ fontSize: '0.8125rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C9A96E', border: '1px solid rgba(201, 169, 110, 0.35)', padding: '5px 16px', transition: 'all 0.2s' }}
                className="hover:bg-[rgba(201,169,110,0.08)]"
              >
                Login
              </Link>
            </nav>
          </div>
        </header>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
