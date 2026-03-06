import { UrlInputForm } from "@/components/UrlInputForm";
import Link from "next/link";

const STATS = [
  { value: "87%", label: "평균 보고서 활용률" },
  { value: "24h", label: "기본 납기 시간" },
  { value: "1/100", label: "기존 컨설팅 대비 비용" },
  { value: "3–20개", label: "분석 경쟁사 범위" },
];

const PROCESS_STEPS = [
  {
    num: "01",
    title: "URL 입력",
    desc: "웹사이트 주소와 업종, 타겟 지역을 입력합니다. 30초면 충분합니다.",
  },
  {
    num: "02",
    title: "AI 자동 분석",
    desc: "Playwright가 경쟁사를 발굴하고 SEO, 키워드, 시장 규모를 병렬 분석합니다.",
  },
  {
    num: "03",
    title: "보고서 수령",
    desc: "Executive Summary, SWOT, 실행 로드맵이 포함된 전략 보고서를 다운로드합니다.",
  },
];

const FEATURES = [
  {
    category: "COMPETITIVE INTELLIGENCE",
    title: "경쟁사 자동 발굴",
    desc: "Google 크롤링을 통해 업종·지역 기반 주요 경쟁사 3–20개를 자동 식별하고 강점·약점을 분석합니다.",
    metric: "최대 20개사",
  },
  {
    category: "SEO AUDIT",
    title: "기술 SEO 감사",
    desc: "스키마 마크업, 메타 태그, 구조화 데이터를 경쟁사 대비 비교 분석하여 우선순위 개선안을 도출합니다.",
    metric: "Schema 비교 분석",
  },
  {
    category: "MARKET SIZING",
    title: "시장 규모 추정",
    desc: "TAM·SAM·SOM 프레임워크로 목표 시장 규모를 정량화하고 성장률·진입 장벽을 평가합니다.",
    metric: "TAM / SAM / SOM",
  },
  {
    category: "KEYWORD STRATEGY",
    title: "고의도 키워드 발굴",
    desc: "구매 의도가 높은 키워드 20–100개를 패턴 기반으로 추출합니다. near_me, 긴급, 가격 비교 등 전환율 중심.",
    metric: "최대 100개 키워드",
  },
  {
    category: "GBP STRATEGY",
    title: "Google 비즈니스 전략",
    desc: "경쟁사 분석 기반으로 최적 포스팅 빈도, 콘텐츠 유형, CTA 스타일, 템플릿 10종을 제안합니다.",
    metric: "10개 템플릿 제공",
  },
  {
    category: "EXECUTIVE REPORT",
    title: "맥킨지 스타일 보고서",
    desc: "Claude Haiku AI가 모든 분석을 통합하여 C-level 의사결정자를 위한 전략 보고서를 자동 생성합니다.",
    metric: "20–100페이지 MD/PDF",
  },
];

const TIERS = [
  {
    id: "basic",
    name: "Starter",
    price: "₩99,000",
    sub: "핵심 시장 검증",
    features: [
      "경쟁사 10개 심층 분석",
      "6섹션 전략 보고서 (2,000자+)",
      "SEO 기술 감사 + 키워드 30개",
      "시장 규모 TAM/SAM/SOM 추정",
      "실행 로드맵 (즉시/단기/중기)",
      "Markdown + PDF 다운로드",
    ],
    cta: "검증 시작하기",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩299,000",
    sub: "투자자급 심층 분석",
    features: [
      "경쟁사 20개 전수 분석",
      "8섹션 전략 보고서 (4,000자+)",
      "키워드 50개 + 콘텐츠 갭 분석",
      "리스크 매트릭스 (발생×영향)",
      "6개월 주차별 실행 로드맵",
      "3가지 재무 시나리오 시뮬레이션",
      "사업계획서 업로드 + SWOT 분석",
    ],
    cta: "Pro 분석 시작",
    highlighted: true,
  },
];

export default function Home() {
  return (
    <main style={{ background: '#0B0C0F', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section className="hero-glow relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(201,169,110,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="max-w-5xl mx-auto relative">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-10 stagger-1">
            <div className="h-px w-8" style={{ background: '#C9A96E' }} />
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A96E', fontFamily: 'var(--font-mono)' }}>
              AI-Powered Business Intelligence
            </span>
          </div>

          {/* Headline */}
          <h1 className="stagger-2 mb-8" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            fontWeight: 300,
            lineHeight: 1.05,
            color: '#EEEAE3',
            letterSpacing: '-0.02em',
          }}>
            비즈니스 아이디어를
            <br />
            <span style={{ color: '#C9A96E', fontWeight: 500 }}>전략 보고서</span>로
            <br />
            <span style={{ fontStyle: 'italic', color: '#9B9BA5' }}>24시간 안에.</span>
          </h1>

          {/* Description */}
          <p className="stagger-3 mb-12 max-w-xl" style={{ fontSize: '1rem', color: '#9B9BA5', lineHeight: 1.7 }}>
            맥킨지·BCG 스타일의 경쟁사 분석, SEO 감사, 시장 규모 추정을 AI가 자동으로 수행합니다.
            기존 전략 컨설팅의 <strong style={{ color: '#EEEAE3' }}>1/100 비용</strong>으로 의사결정에 필요한 인사이트를 확보하세요.
          </p>

          {/* Divider */}
          <div className="gold-rule mb-12 stagger-3" />

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 stagger-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#C9A96E', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52535A', marginTop: '4px', letterSpacing: '0.04em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="stagger-5">
            <UrlInputForm />
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#C9A96E' }} />
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A96E', fontFamily: 'var(--font-mono)' }}>Process</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#EEEAE3', marginBottom: '3rem' }}>
            3단계, <span style={{ fontStyle: 'italic', color: '#9B9BA5' }}>그것뿐입니다</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-0">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.num} className="relative" style={{
                padding: '2rem',
                borderTop: '1px solid rgba(201,169,110,0.2)',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : undefined,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>
                  {step.num}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, color: '#EEEAE3', marginBottom: '0.75rem' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#9B9BA5', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-24" style={{ background: '#0F1014', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#C9A96E' }} />
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A96E', fontFamily: 'var(--font-mono)' }}>Capabilities</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#EEEAE3', marginBottom: '3rem' }}>
            분석 범위
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#0F1014', padding: '2rem' }} className="group hover:bg-[#14161C] transition-colors duration-300">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#C9A96E', letterSpacing: '0.12em', marginBottom: '1rem', opacity: 0.8 }}>
                  {f.category}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, color: '#EEEAE3', marginBottom: '0.75rem' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#9B9BA5', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                  {f.desc}
                </p>
                <div style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.25)', padding: '3px 10px' }}>
                  {f.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#C9A96E' }} />
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A96E', fontFamily: 'var(--font-mono)' }}>Pricing</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#EEEAE3', marginBottom: '0.75rem' }}>
            투명한 가격 정책
          </h2>
          <p style={{ fontSize: '0.9375rem', color: '#9B9BA5', marginBottom: '3rem' }}>
            숨겨진 비용 없음. 필요한 만큼만 선택하세요.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {TIERS.map((tier) => (
              <div key={tier.id} style={{
                background: tier.highlighted ? 'rgba(201,169,110,0.06)' : '#14161C',
                border: tier.highlighted ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.07)',
                padding: '2rem',
                position: 'relative',
              }}>
                {tier.highlighted && (
                  <div style={{
                    position: 'absolute',
                    top: '-1px',
                    left: '2rem',
                    right: '2rem',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)',
                  }} />
                )}
                {tier.highlighted && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    color: '#0B0C0F',
                    background: '#C9A96E',
                    padding: '3px 10px',
                    letterSpacing: '0.1em',
                    whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: tier.highlighted ? '#C9A96E' : '#52535A', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  {tier.name.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 600, color: '#EEEAE3', lineHeight: 1 }}>
                  {tier.price}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#9B9BA5', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                  {tier.sub}
                </div>

                <div className="gold-rule mb-6" />

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ fontSize: '0.8125rem', color: '#9B9BA5', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ color: '#C9A96E', flexShrink: 0, marginTop: '1px' }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a href="#form" style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px 20px',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                  background: tier.highlighted ? '#C9A96E' : 'transparent',
                  color: tier.highlighted ? '#0B0C0F' : '#C9A96E',
                  border: tier.highlighted ? 'none' : '1px solid rgba(201,169,110,0.35)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}>
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Methodology */}
      <section className="px-6 py-16" style={{ background: '#0F1014', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { label: "데이터 수집", value: "공개 데이터만", detail: "robots.txt 준수, 개인정보 미수집" },
              { label: "AI 엔진", value: "Claude Haiku", detail: "Anthropic의 최신 언어 모델 사용" },
              { label: "분석 방법론", value: "McKinsey MECE", detail: "상호배타적 완전포괄 구조화 분석" },
            ].map((item) => (
              <div key={item.label} style={{ padding: '1.5rem 1rem', borderLeft: '1px solid rgba(201,169,110,0.12)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: '#52535A', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  {item.label.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 500, color: '#EEEAE3', marginBottom: '0.25rem' }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52535A' }}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#52535A' }}>
            © 2026 BizValidate
          </div>
          <div style={{ fontSize: '0.75rem', color: '#52535A', textAlign: 'center' }}>
            공개 데이터만 수집합니다. 개인정보 처리 없음.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#52535A' }}>
            Powered by Claude Haiku
          </div>
        </div>
      </footer>
    </main>
  );
}
