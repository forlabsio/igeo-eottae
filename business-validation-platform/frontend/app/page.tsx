import { UrlInputForm } from "@/components/UrlInputForm";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: "⚡",
    title: "24시간 내 완성",
    desc: "AI 에이전트가 밤새 분석. 아침에 결과 확인.",
  },
  {
    icon: "🔍",
    title: "경쟁사 자동 분석",
    desc: "Google에서 주요 경쟁사를 자동 발굴하고 심층 분석.",
  },
  {
    icon: "📊",
    title: "맥킨지 스타일 보고서",
    desc: "Executive Summary, SWOT, 실행 로드맵 포함.",
  },
  {
    icon: "💡",
    title: "실행 가능한 인사이트",
    desc: "추상적 조언이 아닌 구체적 액션 아이템 제공.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero */}
      <section className="px-4 py-24 text-center text-white">
        <Badge className="mb-6 bg-blue-600 hover:bg-blue-600 text-white px-4 py-1">
          AI 기반 비즈니스 검증 플랫폼
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          비즈니스 아이디어를
          <br />
          <span className="text-blue-400">24시간 내 검증</span>하세요
        </h1>
        <p className="text-xl text-slate-300 mb-3">
          맥킨지 스타일 전략 보고서 자동 생성 | ₩99,000부터
        </p>
        <p className="text-slate-400 mb-12">
          기존 컨설팅 대비 10배 빠르고 1/100 가격
        </p>
        <UrlInputForm />
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">무엇이 다른가요?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">간단한 가격 정책</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "빠른 검증",
                price: "₩99,000",
                features: [
                  "경쟁사 3개 분석",
                  "20페이지 보고서",
                  "Markdown 다운로드",
                  "24시간 내 완성",
                ],
                highlighted: false,
              },
              {
                name: "심층 분석",
                price: "₩299,000",
                features: [
                  "경쟁사 10개 분석",
                  "50페이지 보고서",
                  "PDF + Markdown",
                  "GBP 전략 포함",
                  "48시간 내 완성",
                ],
                highlighted: true,
              },
              {
                name: "전략+실행",
                price: "₩999,000",
                features: [
                  "경쟁사 20개 분석",
                  "100페이지 보고서",
                  "PDF + MD + PPT",
                  "6개월 로드맵",
                  "1주 내 완성",
                ],
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-blue-600 text-white shadow-2xl scale-105"
                    : "bg-white border border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-6">{plan.price}</div>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm ${
                        plan.highlighted ? "text-blue-100" : "text-gray-600"
                      }`}
                    >
                      ✓ {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 text-sm">
        <p>© 2026 Business Validation Platform. 공개 데이터만 사용합니다.</p>
      </footer>
    </main>
  );
}
