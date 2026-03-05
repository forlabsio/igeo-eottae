# RePay — Dunning SaaS 설계 문서

**작성일:** 2026-03-05
**상태:** 확정

---

## 1. 제품 개요

소규모 SaaS 창업자(월 매출 500만 원 이하)가 Stripe 결제 실패를 자동으로 복구하고 ROI를 확인할 수 있는 Dunning 자동화 툴.

**핵심 플로우:**
```
사용자 가입 → Stripe API Key 연동 → invoice.payment_failed 수신
→ 드립 이메일 자동 발송 (즉시 / 3일 후 / 7일 후)
→ 복구 성공 시 ROI 대시보드 반영
```

---

## 2. 기술 스택

| 레이어 | 기술 |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Styling | Tailwind CSS + shadcn/ui + Lucide Icons |
| Payments | Stripe API (Restricted API Key) |
| Email | Resend + React Email |
| Scheduling | Upstash QStash |

---

## 3. 아키텍처 개요

```
[Stripe 대시보드 - 사용자 계정]
  └─▶ Webhook (invoice.payment_failed / invoice.payment_succeeded)
        └─▶ POST /api/webhooks/stripe/[userId]
              ├─▶ 1. stripe-signature 검증 (유저별 webhook_secret)
              ├─▶ 2. 멱등성 체크 (stripe_invoice_id UNIQUE ON CONFLICT DO NOTHING)
              ├─▶ 3. failed_payments INSERT
              ├─▶ 4. Resend: Step 1 이메일 즉시 발송
              └─▶ 5. QStash: Step 2(+3일), Step 3(+7일) 예약

[QStash 콜백 - 지연 발송]
  └─▶ POST /api/email/send
        ├─▶ QStash 서명 검증
        ├─▶ status === 'pending' 확인 (이미 복구됐으면 스킵)
        └─▶ Resend: 해당 step 이메일 발송

[invoice.payment_succeeded 처리]
  └─▶ POST /api/webhooks/stripe/[userId]
        ├─▶ failed_payments status → 'recovered'
        ├─▶ QStash.cancel(qstash_step2_id) - 남은 예약 취소
        └─▶ QStash.cancel(qstash_step3_id)
```

**Stripe 연동 UX 개선 (자동 Webhook 등록):**
사용자가 Restricted API Key 입력 시, `stripe.webhookEndpoints.create()`를 호출해 webhook을 자동 등록하고 `webhook_secret`을 DB에 저장. 사용자가 Stripe 대시보드에서 수동 설정할 필요 없음.

---

## 4. 데이터베이스 스키마

```sql
-- users (auth.users 확장)
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  stripe_api_key        TEXT,              -- AES 암호화 저장
  stripe_account_id     TEXT,
  webhook_secret        TEXT,              -- 자동 등록된 webhook signing secret
  subscription_status   TEXT DEFAULT 'free',  -- free | active | cancelled
  email_template_step1  TEXT,             -- 사용자 커스터마이징 템플릿
  email_template_step2  TEXT,
  email_template_step3  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- failed_payments (핵심 테이블)
CREATE TABLE public.failed_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id),
  stripe_customer_id    TEXT NOT NULL,
  stripe_invoice_id     TEXT NOT NULL UNIQUE,  -- 멱등성 키
  stripe_customer_email TEXT,
  stripe_customer_name  TEXT,
  amount                INTEGER NOT NULL,       -- 최소 단위 (원화: 원, USD: 센트)
  currency              TEXT NOT NULL DEFAULT 'krw',
  status                TEXT NOT NULL DEFAULT 'pending',  -- pending | recovered | failed
  email_step            INTEGER NOT NULL DEFAULT 0,        -- 0 = 미발송, 1/2/3 = 각 단계 완료
  qstash_step2_id       TEXT,   -- 복구 시 취소용
  qstash_step3_id       TEXT,
  failed_at             TIMESTAMPTZ DEFAULT NOW(),
  recovered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- recovery_logs (디버깅용)
CREATE TABLE public.recovery_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_payment_id   UUID REFERENCES public.failed_payments(id),
  user_id             UUID REFERENCES public.users(id),
  event_type          TEXT NOT NULL,  -- webhook_received | email_sent | recovered | cancelled
  event_data          JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_only"    ON public.users           FOR ALL USING (auth.uid() = id);
CREATE POLICY "payments_self_only" ON public.failed_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "logs_self_only"     ON public.recovery_logs   FOR ALL USING (auth.uid() = user_id);
```

---

## 5. 폴더 구조

```
repay/
├── app/
│   ├── (landing)/
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # 인증 가드
│   │   ├── dashboard/page.tsx              # 메트릭 + 액티비티
│   │   └── settings/page.tsx
│   └── api/
│       ├── webhooks/stripe/[userId]/route.ts
│       ├── email/send/route.ts              # QStash 콜백
│       └── stripe/
│           ├── connect/route.ts             # API 키 저장 + webhook 등록
│           └── disconnect/route.ts
│
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx
│   │   ├── HowItWorks.tsx
│   │   └── PricingSection.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── MetricsGrid.tsx
│   │   ├── ActivityTable.tsx
│   │   └── StepBadge.tsx
│   └── settings/
│       ├── StripeConnectCard.tsx
│       └── EmailTemplateEditor.tsx
│
├── emails/
│   ├── Step1FailedEmail.tsx
│   ├── Step2ReminderEmail.tsx
│   └── Step3FinalEmail.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                        # 브라우저용
│   │   └── server.ts                        # 서버용 (cookies)
│   ├── stripe.ts
│   ├── resend.ts
│   ├── qstash.ts
│   ├── crypto.ts                            # API 키 AES 암호화/복호화
│   └── errors.ts                            # AppError, WebhookError 커스텀 클래스
│
└── types/
    └── database.ts                          # Supabase gen types
```

---

## 6. API 라우트 설계

### `POST /api/webhooks/stripe/[userId]`
1. `stripe-signature` 헤더 검증 (유저 DB에서 `webhook_secret` 조회)
2. `invoice.payment_failed`:
   - `failed_payments` INSERT (`ON CONFLICT (stripe_invoice_id) DO NOTHING` — 멱등성)
   - Resend로 Step 1 이메일 즉시 발송
   - QStash에 Step 2 (+3일), Step 3 (+7일) 메시지 예약
   - `qstash_step2_id`, `qstash_step3_id` DB 저장
3. `invoice.payment_succeeded`:
   - `failed_payments` 에서 `stripe_invoice_id`로 조회
   - `status = 'recovered'`, `recovered_at = NOW()` 업데이트
   - QStash 예약 메시지 취소

### `POST /api/email/send`
1. QStash 서명 검증 (`@upstash/qstash` Receiver)
2. body: `{ failedPaymentId, step, userId }`
3. `failed_payments.status` 확인 → `pending`이 아니면 200 반환 (취소된 건)
4. 유저의 커스텀 템플릿 조회
5. Resend 발송 + `email_step` 업데이트 + `recovery_logs` INSERT

### `POST /api/stripe/connect`
1. 인증된 유저만 접근
2. Stripe API 키로 `stripe.accounts.retrieve()` → 유효성 검사
3. `stripe.webhookEndpoints.create()` — webhook 자동 등록
4. AES 암호화 후 `users` 테이블 저장

---

## 7. UI 설계

### 랜딩 페이지
- **Hero:** "5만원으로 27만원을 되찾으세요" + Stripe 연동 CTA
- **How it works:** 3단계 아이콘 (연동 → 자동 발송 → ROI 확인)
- **Pricing:** 단일 플랜 ₩49,000/월

### 대시보드
- **MetricsGrid:** 날아갈 뻔한 돈 / 되찾은 돈 / 복구율 — 3개 카드
- **ActivityTable:** 고객명, 금액, 상태, 이메일 단계 배지

### 설정 페이지
- **StripeConnectCard:** API 키 입력, 연동 상태, Webhook URL (읽기 전용)
- **EmailTemplateEditor:** Step 1/2/3 탭 전환, 텍스트 편집 + 미리보기

---

## 8. 드립 이메일 시나리오

| 단계 | 발송 시점 | 메시지 |
|---|---|---|
| Step 1 | 즉시 | "결제가 실패했습니다. 카드 정보를 확인해주세요." |
| Step 2 | +3일 | "잔액이 부족할 수 있어요. 새 카드로 업데이트해보세요." (카드 변경 링크 포함) |
| Step 3 | +7일 | "곧 구독이 취소됩니다. 지금 바로 확인해주세요." |

**취소 조건:** `invoice.payment_succeeded` 수신 시 남은 예약 이메일 모두 QStash에서 취소.

---

## 9. 환경변수 목록

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Upstash QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# 암호화
ENCRYPTION_KEY=          # 32바이트 랜덤 문자열

# App
NEXT_PUBLIC_APP_URL=https://repay.app
```

---

## 10. 필요 패키지

```bash
npm install @supabase/supabase-js @supabase/ssr stripe @upstash/qstash resend react-email @react-email/components

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add card table badge button input tabs
```
