# Pre-Check Service with Git — 설계 문서

**작성일**: 2026-03-11
**버전**: 1.0

---

## 1. 프로젝트 개요

GitHub 저장소의 소스코드를 분석하여 런칭 전 보안 취약점을 진단하고, AI 수정 프롬프트까지 제공하는 서비스.

- **가격**: 9,900원 (단일 상품, 분석 + 보고서 1회)
- **핵심 차별점**: 취약점마다 "바이브 코딩용 프롬프트" 제공 → 사용자가 AI에 바로 붙여넣어 수정 가능

---

## 2. 기술 스택 확정

| 항목 | 선택 |
|------|------|
| 프론트엔드 | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| 백엔드 | Next.js API Routes (TypeScript) |
| 분석 Worker | Node.js + BullMQ (별도 Railway 서비스, Docker) |
| 분석 엔진 | Semgrep + TruffleHog (MVP) |
| 데이터베이스 | PostgreSQL (Railway 내장) + Prisma ORM |
| 큐 | Redis (Railway 내장) + BullMQ |
| 결제 | Toss Payments (서버사이드 금액 검증) |
| 인증 | NextAuth.js (GitHub OAuth) |
| 보고서 | React → HTML → Puppeteer → PDF |
| 배포 | Railway (서비스 4개) |

---

## 3. 전체 아키텍처

```
Railway Services
├── 1. Next.js App     (프론트엔드 + API Routes)
│   ├── GitHub OAuth (NextAuth.js)
│   ├── 대시보드 UI
│   ├── Toss Payments 연동
│   └── API Routes
│
├── 2. Worker Service  (Docker - 분석 엔진)
│   ├── Semgrep CLI
│   ├── TruffleHog CLI
│   ├── BullMQ Consumer
│   └── Puppeteer (PDF 생성)
│
├── 3. PostgreSQL      (Railway 내장)
└── 4. Redis           (Railway 내장 - BullMQ 큐)
```

**데이터 흐름:**
```
사용자 GitHub 로그인
  → 저장소 선택 (GitHub API)
  → Toss Payments 9,900원 결제
  → 서버사이드 금액 검증 (amount !== 9900 시 결제 취소)
  → Redis 큐에 분석 잡 등록
  → Worker: 임시 클론 → Semgrep → TruffleHog → 정규화
  → 바이브 코딩 프롬프트 자동 생성
  → HTML/PDF 보고서 생성 (맥킨지 스타일)
  → PostgreSQL 저장 → 임시 파일 삭제
  → 사용자 마이페이지에서 영구 다운로드
```

---

## 4. 데이터베이스 스키마

```sql
-- 사용자 (NextAuth.js 자동 관리)
users
  id, email, name, github_id, github_token (암호화), created_at

-- 분석 잡
analysis_jobs
  id, user_id, repo_full_name, repo_url
  status: pending | running | completed | failed
  payment_id, paid_at, started_at, completed_at

-- 분석 결과
analysis_results
  id, job_id
  score (0-100)
  critical_count, high_count, medium_count, low_count
  semgrep_findings (JSONB)
  truffle_findings (JSONB)
  report_html (TEXT)
  report_pdf_path (TEXT)   -- Railway Volume 영구 저장

-- 결제 내역
payments
  id, user_id, job_id
  toss_payment_key, amount (9900)
  status: pending | done | failed
  paid_at
```

**설계 원칙:**
- `semgrep_findings`, `truffle_findings` → PostgreSQL JSONB (유연한 구조)
- PDF는 Railway Volume에 영구 보존 (마이페이지 재다운로드용)
- GitHub 토큰은 암호화 저장, 잡 완료 후 마스킹

---

## 5. API Routes

```
인증
  GET  /api/auth/[...nextauth]      GitHub OAuth

저장소
  GET  /api/repos                   사용자 GitHub 레포 목록

결제
  POST /api/payment/prepare         Toss 결제 준비 (pending job 생성)
  POST /api/payment/confirm         결제 확인 + 서버사이드 금액 검증 → 큐 등록
  POST /api/payment/webhook         Toss 웹훅 (실패 처리)

분석
  GET  /api/jobs/[id]               분석 상태 폴링
  GET  /api/jobs/[id]/report        보고서 HTML
  GET  /api/jobs/[id]/pdf           PDF 다운로드

마이페이지
  GET  /api/my/reports              내 전체 분석 이력
  GET  /api/my/reports/[jobId]/pdf  PDF 재다운로드 (영구)
```

**결제 금액 검증:**
```typescript
const PRODUCT_PRICE = 9900 // 서버에서만 정의

const tossResult = await toss.confirm(paymentKey, orderId, amount)

if (tossResult.totalAmount !== PRODUCT_PRICE) {
  await toss.cancel(paymentKey, '금액 불일치')
  return res.status(400).json({ error: '결제 금액 불일치' })
}
```

---

## 6. Worker 분석 파이프라인

```dockerfile
# Dockerfile.worker
FROM python:3.11-slim
RUN pip install semgrep
RUN curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh
RUN apt-get install -y git nodejs npm
```

**파이프라인:**
```
1. Redis 큐에서 잡 수신 (BullMQ)
2. GitHub 토큰으로 레포 임시 클론 → /tmp/{jobId}/
3. Semgrep 실행
   semgrep --config=p/owasp-top-ten --config=p/secrets --json
4. TruffleHog 실행
   trufflehog git file:///tmp/{jobId} --json (커밋 히스토리 포함)
5. 결과 정규화 (Critical/High/Medium/Low 분류, 중복 제거)
6. 보안 점수 계산
7. 바이브 코딩 프롬프트 자동 생성
8. 보고서 생성 (HTML → Puppeteer → PDF)
9. /tmp/{jobId}/ 삭제 (코드 미보관)
10. DB 업데이트 → status: completed
```

**보안 점수 계산:**
```typescript
const score = Math.max(0, 100
  - critical * 25
  - high     * 10
  - medium   *  3
  - low      *  1
  - secrets  * 20  // TruffleHog 탐지 건당
)
```

**타임아웃:** BullMQ 15분 → 초과 시 status: failed

---

## 7. 보고서 설계

### 파일명
```
{github-username}-{repo-name}.pdf
예: peterchae-my-startup.pdf
```

### 디자인 원칙 (맥킨지 스타일)
- 흰 배경, 진한 네이비/차콜 타이포그래피
- 차트/배지로 정보 시각화 (도넛 차트, 심각도 배지)
- 짧고 명확한 문장, 불릿 포인트 위주
- 섹션마다 1줄 핵심 인사이트
- 전문 용어 + 괄호로 쉬운 설명 병기

### 보고서 구조
```
1. Executive Summary
   - 보안 점수 (도넛 차트, 0-100)
   - 심각도별 카운트 (Critical / High / Medium / Low)
   - 주요 개선 항목 Top 3

2. 취약점 상세 (Semgrep)
   각 취약점마다:
   - 취약점명 + 심각도 배지
   - 파일명:라인번호
   - 설명 (비개발자용 쉬운 언어)
   - 수정 코드 예시 (before / after)
   - OWASP / KISA 가이드 링크
   - 바이브 코딩 프롬프트 (복사 가능)

3. 비밀정보 탐지 (TruffleHog)
   - 탐지된 패턴 (실제 값 마스킹: sk-****1234)
   - 발견된 커밋 해시
   - 즉시 조치 권고사항
   - 바이브 코딩 프롬프트

4. 액션 체크리스트
   - 우선순위별 TODO (Critical 먼저)
   - 바이브 코딩 프롬프트 모음
```

### 바이브 코딩 프롬프트 (핵심 차별점)
```typescript
function generateVibePrompt(finding: Finding): string {
  return (
    `내 ${finding.file} 파일 ${finding.line}번째 줄에 ` +
    `${finding.title} 취약점이 발견됐어. ` +
    `${finding.fix_description} ` +
    `현재 코드:\n\`\`\`\n${finding.code_snippet}\n\`\`\`\n` +
    `이 부분을 안전하게 수정해줘.`
  )
}
```

HTML 보고서: [📋 복사하기] 버튼 제공
PDF 보고서: 프롬프트 텍스트 그대로 출력

---

## 8. UI 페이지 구성

```
/                    랜딩 페이지 (서비스 소개, 9,900원 CTA, 샘플 보고서)
/login               GitHub OAuth 로그인
/repos               저장소 선택 (public/private 모두)
/payment             결제 페이지 (Toss Payments)
/analysis/[jobId]    분석 진행 중 (3초 폴링, 단계별 상태)
/report/[jobId]      보고서 뷰어 (HTML, PDF 다운로드, 프롬프트 복사)
/mypage              마이페이지 (이력 목록, PDF 영구 재다운로드)
```

**UX 플로우:**
```
랜딩 → GitHub 로그인 → 레포 선택 → 결제 → 분석 대기 → 보고서
                                                        ↑
                                              마이페이지에서 영구 접근
```

---

## 9. 개발 우선순위 (MVP)

1. Railway 프로젝트 세팅 (Postgres, Redis)
2. Next.js 앱 생성 + Prisma 스키마
3. GitHub OAuth (NextAuth.js)
4. 저장소 목록 페이지
5. Toss Payments 결제 플로우 (서버사이드 검증 포함)
6. Worker Docker 이미지 (Semgrep + TruffleHog)
7. BullMQ 큐 연동
8. 분석 파이프라인 + 결과 정규화
9. 바이브 코딩 프롬프트 생성
10. 맥킨지 스타일 보고서 (HTML + Puppeteer PDF)
11. 마이페이지 (영구 재다운로드)
12. 랜딩 페이지

---

## 10. 보안 고려사항

- GitHub 토큰 암호화 저장 (AES-256)
- 사용자 코드는 분석 후 즉시 삭제 (미보관)
- 서버사이드 가격 검증 필수
- Worker는 격리된 컨테이너에서 실행
- 분석 결과는 본인만 접근 가능 (API 인증 필수)
