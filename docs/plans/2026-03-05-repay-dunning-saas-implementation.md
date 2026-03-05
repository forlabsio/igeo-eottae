# RePay Dunning SaaS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stripe 결제 실패를 자동으로 복구하는 Dunning SaaS — 웹훅 수신 → 드립 이메일 → ROI 대시보드

**Architecture:** Next.js App Router + Supabase(PostgreSQL/RLS) + Upstash QStash(지연 스케줄링) + Resend(이메일). Stripe Restricted API Key로 유저별 계정 연동, 유저별 webhook 엔드포인트(/api/webhooks/stripe/[userId])로 멱등성 보장.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, shadcn/ui, Stripe, Upstash QStash, Resend, React Email

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `repay/` (프로젝트 루트)
- Create: `repay/.env.local`

**Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/peterchae
npx create-next-app@latest repay --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd repay
```

Expected: `repay/` 폴더 생성됨, `app/`, `public/`, `package.json` 존재 확인

**Step 2: 필요 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr stripe @upstash/qstash resend react-email @react-email/components @react-email/tailwind
```

Expected: `node_modules/` 에 해당 패키지 설치 완료

**Step 3: shadcn/ui 초기화**

```bash
npx shadcn@latest init -d
npx shadcn@latest add card table badge button input tabs label textarea
```

Expected: `components/ui/` 폴더에 card.tsx, table.tsx 등 생성됨

**Step 4: .env.local 생성**

```bash
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend
RESEND_API_KEY=re_your_key

# Upstash QStash
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

# AES Encryption (32바이트 랜덤 - openssl rand -hex 16 으로 생성)
ENCRYPTION_KEY=your_32_byte_hex_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**Step 5: 기본 디렉터리 구조 생성**

```bash
mkdir -p lib/supabase emails components/landing components/dashboard components/settings types
```

**Step 6: git 초기화 및 첫 커밋**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: 커스텀 에러 클래스 + 타입 시스템

**Files:**
- Create: `lib/errors.ts`
- Create: `types/database.ts`
- Create: `lib/errors.test.ts`

**Step 1: 에러 클래스 테스트 작성**

```typescript
// lib/errors.test.ts
import { AppError, WebhookError, StripeConnectError } from './errors'

describe('Custom Error Classes', () => {
  test('AppError has correct name and message', () => {
    const err = new AppError('something failed', 500)
    expect(err.message).toBe('something failed')
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('AppError')
    expect(err instanceof Error).toBe(true)
  })

  test('WebhookError defaults to 400', () => {
    const err = new WebhookError('bad signature')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('WebhookError')
  })

  test('StripeConnectError defaults to 422', () => {
    const err = new StripeConnectError('invalid key')
    expect(err.statusCode).toBe(422)
  })
})
```

**Step 2: 테스트 실행 확인 (실패 확인)**

```bash
npx jest lib/errors.test.ts --no-coverage 2>&1 | head -20
```

Expected: `Cannot find module './errors'` 에러 (정상 실패)

**Step 3: 에러 클래스 구현**

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class WebhookError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, cause)
    this.name = 'WebhookError'
  }
}

export class StripeConnectError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 422, cause)
    this.name = 'StripeConnectError'
  }
}
```

**Step 4: 타입 정의 작성**

```typescript
// types/database.ts
export type PaymentStatus = 'pending' | 'recovered' | 'failed'
export type SubscriptionStatus = 'free' | 'active' | 'cancelled'

export interface User {
  id: string
  email: string
  stripe_api_key: string | null
  stripe_account_id: string | null
  webhook_secret: string | null
  subscription_status: SubscriptionStatus
  email_template_step1: string | null
  email_template_step2: string | null
  email_template_step3: string | null
  created_at: string
}

export interface FailedPayment {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_invoice_id: string
  stripe_customer_email: string | null
  stripe_customer_name: string | null
  amount: number
  currency: string
  status: PaymentStatus
  email_step: number
  qstash_step2_id: string | null
  qstash_step3_id: string | null
  failed_at: string
  recovered_at: string | null
  created_at: string
}

export interface RecoveryLog {
  id: string
  failed_payment_id: string | null
  user_id: string | null
  event_type: 'webhook_received' | 'email_sent' | 'recovered' | 'cancelled'
  event_data: Record<string, unknown> | null
  created_at: string
}

// 대시보드 메트릭 계산용
export interface DashboardMetrics {
  totalFailed: number      // 이번 달 총 실패 금액
  totalRecovered: number   // 이번 달 복구 금액
  recoveryRate: number     // 복구율 (0-100)
  currency: string
}
```

**Step 5: Jest 설정 추가 (없으면)**

```bash
npm install -D jest @types/jest ts-jest
```

`package.json`에 추가:
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    }
  }
}
```

**Step 6: 테스트 통과 확인**

```bash
npx jest lib/errors.test.ts --no-coverage
```

Expected: `3 passed`

**Step 7: 커밋**

```bash
git add lib/errors.ts lib/errors.test.ts types/database.ts
git commit -m "feat: add custom error classes and TypeScript types"
```

---

## Task 3: AES 암호화 유틸리티

**Files:**
- Create: `lib/crypto.ts`
- Create: `lib/crypto.test.ts`

**Step 1: 테스트 작성**

```typescript
// lib/crypto.test.ts
import { encryptApiKey, decryptApiKey } from './crypto'

// 테스트용 32바이트 hex 키
process.env.ENCRYPTION_KEY = 'a'.repeat(32)

describe('AES Encryption', () => {
  test('encrypt and decrypt round-trip', () => {
    const original = 'sk_live_abc123def456'
    const encrypted = encryptApiKey(original)

    expect(encrypted).not.toBe(original)
    expect(encrypted).toContain(':') // iv:ciphertext 형식

    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(original)
  })

  test('same input produces different ciphertext (random IV)', () => {
    const key = 'sk_live_testkey'
    const enc1 = encryptApiKey(key)
    const enc2 = encryptApiKey(key)
    expect(enc1).not.toBe(enc2) // 매번 다른 IV
  })

  test('decryptApiKey throws on invalid ciphertext', () => {
    expect(() => decryptApiKey('invalid_ciphertext')).toThrow()
  })
})
```

**Step 2: 실패 확인**

```bash
npx jest lib/crypto.test.ts --no-coverage 2>&1 | head -10
```

Expected: `Cannot find module './crypto'`

**Step 3: crypto.ts 구현**

```typescript
// lib/crypto.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is not set')
  // hex 문자열 → 32바이트 버퍼
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8')
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !encryptedHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
```

**Step 4: 테스트 통과 확인**

```bash
npx jest lib/crypto.test.ts --no-coverage
```

Expected: `3 passed`

**Step 5: 커밋**

```bash
git add lib/crypto.ts lib/crypto.test.ts
git commit -m "feat: add AES-256-CBC encryption for Stripe API keys"
```

---

## Task 4: Supabase 클라이언트 설정

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Step 1: 브라우저용 클라이언트**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: 서버용 클라이언트 (Server Components + Route Handlers)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Components, Route Handlers용 (인증 유저 컨텍스트)
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 설정 불가 (무시)
          }
        },
      },
    }
  )
}

// Webhook Route Handler용 (Service Role — RLS 우회)
export function createServiceSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

**Step 3: Stripe 인스턴스**

```typescript
// lib/stripe.ts
import Stripe from 'stripe'

// 기본 Stripe 인스턴스 (유저 API 키로 인스턴스 생성 시에는 new Stripe(userApiKey) 사용)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export function createStripeClient(apiKey: string) {
  return new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  })
}
```

**Step 4: Resend + QStash 인스턴스**

```typescript
// lib/resend.ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY!)
```

```typescript
// lib/qstash.ts
import { Client as QStashClient, Receiver } from '@upstash/qstash'

export const qstash = new QStashClient({
  token: process.env.QSTASH_TOKEN!,
})

export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})
```

**Step 5: 커밋**

```bash
git add lib/supabase/ lib/stripe.ts lib/resend.ts lib/qstash.ts
git commit -m "feat: add Supabase, Stripe, Resend, QStash client setup"
```

---

## Task 5: Supabase 데이터베이스 스키마

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Supabase CLI 로컬 설정 (선택사항, 없으면 대시보드에서 직접 실행)**

```bash
# Supabase 대시보드 SQL Editor에서 아래 SQL 실행
```

**Step 2: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/001_initial_schema.sql

-- users 테이블 (auth.users 확장)
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  stripe_api_key        TEXT,
  stripe_account_id     TEXT,
  webhook_secret        TEXT,
  subscription_status   TEXT NOT NULL DEFAULT 'free'
                        CHECK (subscription_status IN ('free', 'active', 'cancelled')),
  email_template_step1  TEXT,
  email_template_step2  TEXT,
  email_template_step3  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- failed_payments 테이블
CREATE TABLE public.failed_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT NOT NULL,
  stripe_invoice_id     TEXT NOT NULL,
  stripe_customer_email TEXT,
  stripe_customer_name  TEXT,
  amount                INTEGER NOT NULL CHECK (amount >= 0),
  currency              TEXT NOT NULL DEFAULT 'krw',
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'recovered', 'failed')),
  email_step            INTEGER NOT NULL DEFAULT 0 CHECK (email_step BETWEEN 0 AND 3),
  qstash_step2_id       TEXT,
  qstash_step3_id       TEXT,
  failed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stripe_invoice_id)  -- 멱등성 키
);

-- recovery_logs 테이블
CREATE TABLE public.recovery_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_payment_id   UUID REFERENCES public.failed_payments(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL
                      CHECK (event_type IN ('webhook_received', 'email_sent', 'recovered', 'cancelled')),
  event_data          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 (쿼리 최적화)
CREATE INDEX idx_failed_payments_user_id ON public.failed_payments(user_id);
CREATE INDEX idx_failed_payments_status ON public.failed_payments(status);
CREATE INDEX idx_failed_payments_failed_at ON public.failed_payments(failed_at DESC);
CREATE INDEX idx_recovery_logs_payment_id ON public.recovery_logs(failed_payment_id);

-- RLS 활성화
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs   ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 접근
CREATE POLICY "users_self_only"    ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "payments_self_only" ON public.failed_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "logs_self_only"     ON public.recovery_logs
  FOR ALL USING (auth.uid() = user_id);

-- 신규 사용자 가입 시 users 테이블 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Step 3: Supabase 대시보드에서 SQL 실행**

1. [Supabase 대시보드](https://app.supabase.com) → 프로젝트 선택
2. SQL Editor → 위 SQL 붙여넣기 → Run
3. Table Editor에서 `users`, `failed_payments`, `recovery_logs` 테이블 생성 확인

**Step 4: 커밋**

```bash
mkdir -p supabase/migrations
git add supabase/
git commit -m "feat: add Supabase database schema with RLS policies"
```

---

## Task 6: 인증 페이지 (로그인/회원가입)

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/login/actions.ts`
- Modify: `app/layout.tsx`

**Step 1: 공통 auth layout**

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

**Step 2: Server Actions (로그인/회원가입)**

```typescript
// app/(auth)/login/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signupAction(formData: FormData) {
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function logoutAction() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
```

**Step 3: 로그인 페이지**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>RePay 로그인</CardTitle>
        <CardDescription>결제 복구 대시보드에 접속합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '로그인 중...' : '로그인'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">회원가입</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 4: 회원가입 페이지**

```tsx
// app/(auth)/signup/page.tsx
'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signupAction } from '../login/actions'

export default function SignupPage() {
  const [state, action, isPending] = useActionState(signupAction, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>무료로 시작하기</CardTitle>
        <CardDescription>지금 가입하고 결제 복구를 자동화하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '가입 중...' : '무료로 시작하기'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 5: 대시보드 레이아웃 (인증 가드)**

```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { logoutAction } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">RePay</h1>
        <nav className="flex items-center gap-4">
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">대시보드</a>
          <a href="/settings" className="text-sm text-gray-600 hover:text-gray-900">설정</a>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">로그아웃</Button>
          </form>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
```

**Step 6: 개발 서버 실행 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/login` 접속 → 로그인 폼 렌더링 확인

**Step 7: 커밋**

```bash
git add app/
git commit -m "feat: add auth pages (login/signup) and dashboard layout with auth guard"
```

---

## Task 7: Stripe 연동 API

**Files:**
- Create: `app/api/stripe/connect/route.ts`
- Create: `app/api/stripe/disconnect/route.ts`

**Step 1: connect route 작성**

```typescript
// app/api/stripe/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import { createStripeClient } from '@/lib/stripe'
import { encryptApiKey } from '@/lib/crypto'
import { StripeConnectError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { apiKey } = await req.json()
    if (!apiKey || typeof apiKey !== 'string') {
      throw new StripeConnectError('API 키를 입력해주세요')
    }

    // 1. API 키 유효성 검증
    const stripe = createStripeClient(apiKey)
    let accountId: string
    try {
      const account = await stripe.accounts.retrieve()
      accountId = account.id
    } catch {
      throw new StripeConnectError('유효하지 않은 Stripe API 키입니다')
    }

    // 2. Webhook 자동 등록
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe/${user.id}`
    let webhookSecret: string
    try {
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: ['invoice.payment_failed', 'invoice.payment_succeeded'],
        description: 'RePay Dunning Automation',
      })
      webhookSecret = webhook.secret!
    } catch (err) {
      // 이미 등록된 webhook이 있으면 목록에서 찾기
      const existing = await stripe.webhookEndpoints.list({ limit: 10 })
      const found = existing.data.find(w => w.url === webhookUrl)
      if (found) {
        // 기존 webhook의 secret은 재조회 불가 — 재생성
        await stripe.webhookEndpoints.del(found.id)
        const webhook = await stripe.webhookEndpoints.create({
          url: webhookUrl,
          enabled_events: ['invoice.payment_failed', 'invoice.payment_succeeded'],
        })
        webhookSecret = webhook.secret!
      } else {
        throw new StripeConnectError('Webhook 등록에 실패했습니다', err)
      }
    }

    // 3. 암호화 후 저장
    const encryptedKey = encryptApiKey(apiKey)
    const serviceSupabase = createServiceSupabase()
    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({
        stripe_api_key: encryptedKey,
        stripe_account_id: accountId,
        webhook_secret: webhookSecret,
      })
      .eq('id', user.id)

    if (updateError) throw new Error('DB 저장 실패')

    return NextResponse.json({
      success: true,
      accountId,
      webhookUrl,
    })
  } catch (err) {
    if (err instanceof StripeConnectError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('Stripe connect error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
```

**Step 2: disconnect route 작성**

```typescript
// app/api/stripe/disconnect/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import { createStripeClient } from '@/lib/stripe'
import { decryptApiKey } from '@/lib/crypto'

export async function POST() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceSupabase = createServiceSupabase()
  const { data: userData } = await serviceSupabase
    .from('users')
    .select('stripe_api_key, stripe_account_id')
    .eq('id', user.id)
    .single()

  if (userData?.stripe_api_key) {
    try {
      const stripe = createStripeClient(decryptApiKey(userData.stripe_api_key))
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe/${user.id}`
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      const toDelete = webhooks.data.find(w => w.url === webhookUrl)
      if (toDelete) await stripe.webhookEndpoints.del(toDelete.id)
    } catch {
      // 조용히 실패 (키가 이미 무효화됐을 수 있음)
    }
  }

  await serviceSupabase
    .from('users')
    .update({ stripe_api_key: null, stripe_account_id: null, webhook_secret: null })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
```

**Step 3: 커밋**

```bash
git add app/api/stripe/
git commit -m "feat: add Stripe connect/disconnect API with auto webhook registration"
```

---

## Task 8: Stripe Webhook 핸들러

**Files:**
- Create: `app/api/webhooks/stripe/[userId]/route.ts`

**Step 1: Webhook 핸들러 작성 (핵심 비즈니스 로직)**

```typescript
// app/api/webhooks/stripe/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase/server'
import { createStripeClient } from '@/lib/stripe'
import { decryptApiKey } from '@/lib/crypto'
import { qstash } from '@/lib/qstash'
import { resend } from '@/lib/resend'
import { render } from '@react-email/components'
import Step1FailedEmail from '@/emails/Step1FailedEmail'
import { WebhookError } from '@/lib/errors'

export const config = { api: { bodyParser: false } }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = createServiceSupabase()

  // 1. 유저 + webhook_secret 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('stripe_api_key, webhook_secret, email')
    .eq('id', userId)
    .single()

  if (userError || !user?.webhook_secret) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2. Stripe 서명 검증
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(body, signature, user.webhook_secret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 3. 로그 기록
  await supabase.from('recovery_logs').insert({
    user_id: userId,
    event_type: 'webhook_received',
    event_data: { event_type: event.type, event_id: event.id },
  })

  try {
    if (event.type === 'invoice.payment_failed') {
      await handlePaymentFailed(event, userId, supabase)
    } else if (event.type === 'invoice.payment_succeeded') {
      await handlePaymentSucceeded(event, userId, supabase)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Stripe는 5xx를 받으면 재시도하므로 상황에 따라 500 반환
    if (err instanceof WebhookError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    // 멱등성 에러(중복)는 200으로 응답
    return NextResponse.json({ received: true, status: 'already_processed' })
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentFailed(
  event: Stripe.Event,
  userId: string,
  supabase: ReturnType<typeof createServiceSupabase>
) {
  const invoice = event.data.object as Stripe.Invoice

  // 멱등성 보장: stripe_invoice_id UNIQUE → 중복이면 무시
  const { data: payment, error: insertError } = await supabase
    .from('failed_payments')
    .insert({
      user_id: userId,
      stripe_customer_id: invoice.customer as string,
      stripe_invoice_id: invoice.id,
      stripe_customer_email: invoice.customer_email,
      stripe_customer_name: (invoice as any).customer_name ?? null,
      amount: invoice.amount_due,
      currency: invoice.currency,
      email_step: 0,
    })
    .select()
    .single()

  // 23505: unique violation (이미 처리된 건)
  if (insertError?.code === '23505') return
  if (insertError || !payment) throw new WebhookError('DB insert failed', insertError)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Step 1 이메일 즉시 발송
  await supabase.from('recovery_logs').insert({
    user_id: userId,
    failed_payment_id: payment.id,
    event_type: 'email_sent',
    event_data: { step: 1, email: invoice.customer_email },
  })

  await resend.emails.send({
    from: 'RePay <noreply@repay.app>',
    to: invoice.customer_email!,
    subject: '⚠️ 결제가 실패했습니다 — 카드 정보를 확인해주세요',
    react: Step1FailedEmail({
      customerEmail: invoice.customer_email ?? '',
      amount: invoice.amount_due,
      currency: invoice.currency,
      updateCardUrl: `${baseUrl}/update-card?invoice=${invoice.id}`,
    }),
  })

  // QStash: Step 2(+3일), Step 3(+7일) 예약
  const payload = { failedPaymentId: payment.id, userId }

  const [step2Res, step3Res] = await Promise.all([
    qstash.publishJSON({
      url: `${baseUrl}/api/email/send`,
      body: { ...payload, step: 2 },
      delay: 3 * 24 * 60 * 60,
    }),
    qstash.publishJSON({
      url: `${baseUrl}/api/email/send`,
      body: { ...payload, step: 3 },
      delay: 7 * 24 * 60 * 60,
    }),
  ])

  // QStash 메시지 ID 저장 (복구 시 취소용)
  await supabase
    .from('failed_payments')
    .update({
      email_step: 1,
      qstash_step2_id: step2Res.messageId,
      qstash_step3_id: step3Res.messageId,
    })
    .eq('id', payment.id)
}

async function handlePaymentSucceeded(
  event: Stripe.Event,
  userId: string,
  supabase: ReturnType<typeof createServiceSupabase>
) {
  const invoice = event.data.object as Stripe.Invoice

  // pending 상태인 건만 복구 처리 (이미 recovered면 무시)
  const { data: payment } = await supabase
    .from('failed_payments')
    .update({ status: 'recovered', recovered_at: new Date().toISOString() })
    .eq('stripe_invoice_id', invoice.id)
    .eq('status', 'pending')
    .select('id, qstash_step2_id, qstash_step3_id')
    .single()

  if (!payment) return // 이미 처리됐거나 없는 건

  // 로그 기록
  await supabase.from('recovery_logs').insert({
    user_id: userId,
    failed_payment_id: payment.id,
    event_type: 'recovered',
    event_data: { invoice_id: invoice.id },
  })

  // 남은 QStash 예약 취소
  const cancelPromises = []
  if (payment.qstash_step2_id) {
    cancelPromises.push(
      qstash.messages.delete(payment.qstash_step2_id).catch(console.warn)
    )
  }
  if (payment.qstash_step3_id) {
    cancelPromises.push(
      qstash.messages.delete(payment.qstash_step3_id).catch(console.warn)
    )
  }
  await Promise.all(cancelPromises)
}
```

**Step 2: 커밋**

```bash
git add app/api/webhooks/
git commit -m "feat: add Stripe webhook handler with idempotency and QStash scheduling"
```

---

## Task 9: QStash 이메일 발송 콜백 API

**Files:**
- Create: `app/api/email/send/route.ts`

**Step 1: 콜백 API 작성**

```typescript
// app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { qstashReceiver } from '@/lib/qstash'
import { createServiceSupabase } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import Step2ReminderEmail from '@/emails/Step2ReminderEmail'
import Step3FinalEmail from '@/emails/Step3FinalEmail'

export async function POST(req: NextRequest) {
  // 1. QStash 서명 검증
  const body = await req.text()
  const signature = req.headers.get('upstash-signature') ?? ''

  try {
    await qstashReceiver.verify({
      signature,
      body,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  const { failedPaymentId, step, userId } = JSON.parse(body) as {
    failedPaymentId: string
    step: 2 | 3
    userId: string
  }

  const supabase = createServiceSupabase()

  // 2. 결제 건 조회
  const { data: payment } = await supabase
    .from('failed_payments')
    .select('*, users(email_template_step2, email_template_step3)')
    .eq('id', failedPaymentId)
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // 3. 이미 복구됐으면 발송 스킵 (멱등성)
  if (payment.status !== 'pending') {
    return NextResponse.json({ status: 'skipped', reason: payment.status })
  }

  const updateCardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/update-card?invoice=${payment.stripe_invoice_id}`

  // 4. 단계별 이메일 발송
  const emailProps = {
    customerEmail: payment.stripe_customer_email ?? '',
    amount: payment.amount,
    currency: payment.currency,
    updateCardUrl,
  }

  if (step === 2) {
    await resend.emails.send({
      from: 'RePay <noreply@repay.app>',
      to: payment.stripe_customer_email!,
      subject: '💳 결제 재시도 안내 — 새 카드로 업데이트해보세요',
      react: Step2ReminderEmail(emailProps),
    })
  } else if (step === 3) {
    await resend.emails.send({
      from: 'RePay <noreply@repay.app>',
      to: payment.stripe_customer_email!,
      subject: '🚨 마지막 알림 — 곧 구독이 취소됩니다',
      react: Step3FinalEmail(emailProps),
    })
  }

  // 5. email_step 업데이트 + 로그
  await Promise.all([
    supabase
      .from('failed_payments')
      .update({ email_step: step })
      .eq('id', failedPaymentId),
    supabase.from('recovery_logs').insert({
      user_id: userId,
      failed_payment_id: failedPaymentId,
      event_type: 'email_sent',
      event_data: { step, email: payment.stripe_customer_email },
    }),
  ])

  return NextResponse.json({ success: true, step })
}
```

**Step 2: 커밋**

```bash
git add app/api/email/
git commit -m "feat: add QStash callback endpoint for delayed drip emails"
```

---

## Task 10: React Email 템플릿 (3개)

**Files:**
- Create: `emails/Step1FailedEmail.tsx`
- Create: `emails/Step2ReminderEmail.tsx`
- Create: `emails/Step3FinalEmail.tsx`
- Create: `emails/components/EmailLayout.tsx`

**Step 1: 공통 레이아웃 컴포넌트**

```tsx
// emails/components/EmailLayout.tsx
import {
  Html, Head, Body, Container, Section, Text, Hr, Link
} from '@react-email/components'

interface EmailLayoutProps {
  children: React.ReactNode
  previewText: string
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
              RePay
            </Text>
            {children}
            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
              이 이메일은 자동으로 발송되었습니다. 문의사항은{' '}
              <Link href="mailto:support@repay.app">support@repay.app</Link>으로 연락해주세요.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

**Step 2: Step1 이메일 (즉시 발송)**

```tsx
// emails/Step1FailedEmail.tsx
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout } from './components/EmailLayout'

interface Props {
  customerEmail: string
  amount: number
  currency: string
  updateCardUrl: string
}

export default function Step1FailedEmail({ customerEmail, amount, currency, updateCardUrl }: Props) {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / (currency === 'krw' ? 1 : 100))

  return (
    <EmailLayout previewText="결제가 실패했습니다 — 카드 정보를 확인해주세요">
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
        ⚠️ 결제가 실패했습니다
      </Text>
      <Text style={{ color: '#374151', lineHeight: '1.6' }}>
        {formatted} 결제가 처리되지 않았습니다.<br />
        카드 정보를 확인하고 업데이트해주세요.
      </Text>
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={updateCardUrl}
          style={{
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '6px',
            fontWeight: 'bold',
            textDecoration: 'none',
          }}
        >
          카드 정보 업데이트하기 →
        </Button>
      </Section>
      <Text style={{ color: '#6b7280', fontSize: '14px' }}>
        지금 업데이트하지 않으면 3일 후 다시 안내드립니다.
      </Text>
    </EmailLayout>
  )
}
```

**Step 3: Step2 이메일 (3일 후)**

```tsx
// emails/Step2ReminderEmail.tsx
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout } from './components/EmailLayout'

interface Props {
  customerEmail: string
  amount: number
  currency: string
  updateCardUrl: string
}

export default function Step2ReminderEmail({ amount, currency, updateCardUrl }: Props) {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / (currency === 'krw' ? 1 : 100))

  return (
    <EmailLayout previewText="잔액 부족? 새 카드로 업데이트하면 바로 해결됩니다">
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
        💳 결제 재시도 안내
      </Text>
      <Text style={{ color: '#374151', lineHeight: '1.6' }}>
        {formatted} 결제가 아직 완료되지 않았습니다.<br />
        잔액이 부족하거나 카드가 만료됐을 수 있어요.
      </Text>
      <Text style={{ color: '#374151', lineHeight: '1.6' }}>
        새 카드로 업데이트하면 구독이 즉시 재개됩니다.
      </Text>
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={updateCardUrl}
          style={{
            backgroundColor: '#f59e0b',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '6px',
            fontWeight: 'bold',
            textDecoration: 'none',
          }}
        >
          새 카드로 업데이트하기 →
        </Button>
      </Section>
      <Text style={{ color: '#6b7280', fontSize: '14px' }}>
        ⏰ 7일 후에도 업데이트되지 않으면 구독이 취소될 수 있습니다.
      </Text>
    </EmailLayout>
  )
}
```

**Step 4: Step3 이메일 (7일 후, 최종 경고)**

```tsx
// emails/Step3FinalEmail.tsx
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout } from './components/EmailLayout'

interface Props {
  customerEmail: string
  amount: number
  currency: string
  updateCardUrl: string
}

export default function Step3FinalEmail({ amount, currency, updateCardUrl }: Props) {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / (currency === 'krw' ? 1 : 100))

  return (
    <EmailLayout previewText="마지막 알림 — 오늘 안에 업데이트하지 않으면 구독이 취소됩니다">
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
        🚨 구독 취소 예정 알림
      </Text>
      <Text style={{ color: '#374151', lineHeight: '1.6' }}>
        <strong>마지막 안내입니다.</strong><br />
        {formatted} 결제가 7일째 미완료 상태입니다.
      </Text>
      <Text style={{ color: '#374151', lineHeight: '1.6' }}>
        지금 카드를 업데이트하지 않으면 <strong>구독이 곧 취소</strong>됩니다.<br />
        서비스 이용이 중단되기 전에 지금 바로 해결해주세요.
      </Text>
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={updateCardUrl}
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '6px',
            fontWeight: 'bold',
            textDecoration: 'none',
          }}
        >
          지금 바로 업데이트하기 →
        </Button>
      </Section>
    </EmailLayout>
  )
}
```

**Step 5: 커밋**

```bash
git add emails/
git commit -m "feat: add React Email templates for 3-step drip campaign"
```

---

## Task 11: 대시보드 UI 컴포넌트

**Files:**
- Create: `components/dashboard/MetricCard.tsx`
- Create: `components/dashboard/MetricsGrid.tsx`
- Create: `components/dashboard/StepBadge.tsx`
- Create: `components/dashboard/ActivityTable.tsx`

**Step 1: MetricCard**

```tsx
// components/dashboard/MetricCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  variant?: 'default' | 'success' | 'warning'
}

export function MetricCard({ title, value, description, icon: Icon, variant = 'default' }: MetricCardProps) {
  const iconColors = {
    default: 'text-gray-400',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
```

**Step 2: MetricsGrid**

```tsx
// components/dashboard/MetricsGrid.tsx
import { MetricCard } from './MetricCard'
import { TrendingDown, TrendingUp, Percent } from 'lucide-react'
import type { DashboardMetrics } from '@/types/database'

interface MetricsGridProps {
  metrics: DashboardMetrics
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(currency === 'krw' ? amount : amount / 100)
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="날아갈 뻔한 돈"
        value={formatCurrency(metrics.totalFailed, metrics.currency)}
        description="이번 달 총 결제 실패 금액"
        icon={TrendingDown}
        variant="warning"
      />
      <MetricCard
        title="되찾은 돈"
        value={formatCurrency(metrics.totalRecovered, metrics.currency)}
        description="이번 달 자동 복구 금액"
        icon={TrendingUp}
        variant="success"
      />
      <MetricCard
        title="복구율"
        value={`${metrics.recoveryRate.toFixed(1)}%`}
        description="결제 실패 대비 복구 비율"
        icon={Percent}
        variant={metrics.recoveryRate >= 50 ? 'success' : 'warning'}
      />
    </div>
  )
}
```

**Step 3: StepBadge**

```tsx
// components/dashboard/StepBadge.tsx
import { Badge } from '@/components/ui/badge'
import type { PaymentStatus } from '@/types/database'

interface StepBadgeProps {
  status: PaymentStatus
  emailStep: number
}

export function StepBadge({ status, emailStep }: StepBadgeProps) {
  if (status === 'recovered') {
    return <Badge className="bg-emerald-100 text-emerald-800">복구됨 ✓</Badge>
  }
  if (status === 'failed') {
    return <Badge variant="destructive">최종 실패</Badge>
  }

  const stepLabels = ['이메일 예정', '1차 발송됨', '2차 발송됨', '3차 발송됨']
  const stepColors = [
    'bg-gray-100 text-gray-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-red-100 text-red-700',
  ]

  return (
    <Badge className={stepColors[emailStep] ?? stepColors[0]}>
      {stepLabels[emailStep] ?? '알 수 없음'}
    </Badge>
  )
}
```

**Step 4: ActivityTable**

```tsx
// components/dashboard/ActivityTable.tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { StepBadge } from './StepBadge'
import type { FailedPayment } from '@/types/database'

interface ActivityTableProps {
  payments: FailedPayment[]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(currency === 'krw' ? amount : amount / 100)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export function ActivityTable({ payments }: ActivityTableProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">아직 결제 실패 내역이 없습니다.</p>
        <p className="text-sm mt-1">Stripe 연동 후 결제 실패가 발생하면 여기에 표시됩니다.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>고객</TableHead>
          <TableHead>금액</TableHead>
          <TableHead>실패 일시</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>
              <div className="font-medium">{payment.stripe_customer_name ?? '이름 없음'}</div>
              <div className="text-sm text-gray-500">{payment.stripe_customer_email}</div>
            </TableCell>
            <TableCell className="font-medium">
              {formatCurrency(payment.amount, payment.currency)}
            </TableCell>
            <TableCell className="text-gray-500 text-sm">
              {formatDate(payment.failed_at)}
            </TableCell>
            <TableCell>
              <StepBadge status={payment.status} emailStep={payment.email_step} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Step 5: 커밋**

```bash
git add components/dashboard/
git commit -m "feat: add dashboard UI components (MetricCard, ActivityTable, StepBadge)"
```

---

## Task 12: 대시보드 페이지

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`

**Step 1: 대시보드 Server Component**

```tsx
// app/(dashboard)/dashboard/page.tsx
import { createServerSupabase } from '@/lib/supabase/server'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { ActivityTable } from '@/components/dashboard/ActivityTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardMetrics, FailedPayment } from '@/types/database'

async function getMetrics(userId: string, supabase: Awaited<ReturnType<typeof createServerSupabase>>): Promise<DashboardMetrics> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: payments } = await supabase
    .from('failed_payments')
    .select('amount, currency, status')
    .eq('user_id', userId)
    .gte('failed_at', startOfMonth.toISOString())

  if (!payments || payments.length === 0) {
    return { totalFailed: 0, totalRecovered: 0, recoveryRate: 0, currency: 'krw' }
  }

  const currency = payments[0].currency
  const totalFailed = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalRecovered = payments
    .filter(p => p.status === 'recovered')
    .reduce((sum, p) => sum + p.amount, 0)
  const recoveryRate = totalFailed > 0 ? (totalRecovered / totalFailed) * 100 : 0

  return { totalFailed, totalRecovered, recoveryRate, currency }
}

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const [metrics, paymentsResult] = await Promise.all([
    getMetrics(user!.id, supabase),
    supabase
      .from('failed_payments')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const payments = (paymentsResult.data ?? []) as FailedPayment[]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
        <p className="text-gray-500 mt-1">이번 달 결제 복구 현황</p>
      </div>

      <MetricsGrid metrics={metrics} />

      <Card>
        <CardHeader>
          <CardTitle>최근 결제 실패 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTable payments={payments} />
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add app/'(dashboard)'/dashboard/
git commit -m "feat: add dashboard page with metrics and activity table"
```

---

## Task 13: 설정 페이지 UI 컴포넌트

**Files:**
- Create: `components/settings/StripeConnectCard.tsx`
- Create: `components/settings/EmailTemplateEditor.tsx`

**Step 1: StripeConnectCard (Client Component)**

```tsx
// components/settings/StripeConnectCard.tsx
'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Copy, Loader2 } from 'lucide-react'

interface StripeConnectCardProps {
  isConnected: boolean
  accountId: string | null
  userId: string
}

export function StripeConnectCard({ isConnected, accountId, userId }: StripeConnectCardProps) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const webhookUrl = `${window.location.origin}/api/webhooks/stripe/${userId}`

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setApiKey('')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '연동에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Stripe 연동을 해제하면 결제 복구 자동화가 중단됩니다. 계속하시겠습니까?')) return
    setLoading(true)
    await fetch('/api/stripe/disconnect', { method: 'POST' })
    window.location.reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stripe 연동
          {isConnected ? (
            <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> 연동됨
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" /> 미연동
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Stripe Restricted API Key를 입력하면 Webhook이 자동으로 등록됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div>
              <Label className="text-sm text-gray-500">연동된 계정 ID</Label>
              <p className="font-mono text-sm mt-1">{accountId}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Webhook URL (자동 등록됨)</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
              연동 해제
            </Button>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="apiKey">Stripe Restricted API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="rk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Stripe 대시보드 → Developers → API Keys → Create restricted key<br />
                필요 권한: Customers(읽기), Invoices(읽기), Webhook Endpoints(쓰기)
              </p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-emerald-600">✓ 연동 완료!</p>}
            <Button onClick={handleConnect} disabled={loading || !apiKey}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 연동 중...</> : 'Stripe 연동하기'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: EmailTemplateEditor (Client Component)**

```tsx
// components/settings/EmailTemplateEditor.tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const DEFAULT_TEMPLATES = {
  step1: '결제가 실패했습니다. 카드 정보를 확인하고 업데이트해주세요.',
  step2: '잔액이 부족할 수 있어요. 새 카드로 업데이트하면 구독이 즉시 재개됩니다.',
  step3: '마지막 안내입니다. 오늘 안에 업데이트하지 않으면 구독이 취소됩니다.',
}

interface EmailTemplateEditorProps {
  initialTemplates: {
    step1: string | null
    step2: string | null
    step3: string | null
  }
}

export function EmailTemplateEditor({ initialTemplates }: EmailTemplateEditorProps) {
  const [templates, setTemplates] = useState({
    step1: initialTemplates.step1 ?? DEFAULT_TEMPLATES.step1,
    step2: initialTemplates.step2 ?? DEFAULT_TEMPLATES.step2,
    step3: initialTemplates.step3 ?? DEFAULT_TEMPLATES.step3,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templates),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const steps = [
    { key: 'step1' as const, label: 'Step 1', timing: '결제 실패 즉시' },
    { key: 'step2' as const, label: 'Step 2', timing: '3일 후' },
    { key: 'step3' as const, label: 'Step 3', timing: '7일 후 (최종)' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>이메일 템플릿 커스터마이징</CardTitle>
        <CardDescription>고객에게 발송될 드립 이메일의 본문을 수정할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="step1">
          <TabsList>
            {steps.map(s => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label} <span className="ml-1 text-xs text-gray-500">({s.timing})</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {steps.map(s => (
            <TabsContent key={s.key} value={s.key} className="mt-4">
              <Label>이메일 본문</Label>
              <Textarea
                value={templates[s.key]}
                onChange={(e) => setTemplates(prev => ({ ...prev, [s.key]: e.target.value }))}
                rows={6}
                className="mt-1"
                placeholder={DEFAULT_TEMPLATES[s.key]}
              />
              <p className="text-xs text-gray-500 mt-1">
                사용 가능한 변수: {'{{amount}}'}, {'{{update_card_url}}'}
              </p>
            </TabsContent>
          ))}
        </Tabs>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 저장 중...</> : '저장하기'}
          </Button>
          {saved && <span className="text-sm text-emerald-600">✓ 저장되었습니다</span>}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: 템플릿 저장 API**

```typescript
// app/api/settings/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { step1, step2, step3 } = await req.json()
  const serviceSupabase = createServiceSupabase()

  await serviceSupabase
    .from('users')
    .update({
      email_template_step1: step1,
      email_template_step2: step2,
      email_template_step3: step3,
    })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
```

**Step 4: 커밋**

```bash
git add components/settings/ app/api/settings/
git commit -m "feat: add settings UI components (StripeConnectCard, EmailTemplateEditor)"
```

---

## Task 14: 설정 페이지

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`

**Step 1: 설정 Server Component**

```tsx
// app/(dashboard)/settings/page.tsx
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server'
import { StripeConnectCard } from '@/components/settings/StripeConnectCard'
import { EmailTemplateEditor } from '@/components/settings/EmailTemplateEditor'

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceSupabase = createServiceSupabase()
  const { data: userData } = await serviceSupabase
    .from('users')
    .select('stripe_account_id, email_template_step1, email_template_step2, email_template_step3')
    .eq('id', user!.id)
    .single()

  const isConnected = !!userData?.stripe_account_id

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">설정</h2>
        <p className="text-gray-500 mt-1">Stripe 연동 및 이메일 템플릿을 관리합니다</p>
      </div>

      <StripeConnectCard
        isConnected={isConnected}
        accountId={userData?.stripe_account_id ?? null}
        userId={user!.id}
      />

      <EmailTemplateEditor
        initialTemplates={{
          step1: userData?.email_template_step1 ?? null,
          step2: userData?.email_template_step2 ?? null,
          step3: userData?.email_template_step3 ?? null,
        }}
      />
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add app/'(dashboard)'/settings/
git commit -m "feat: add settings page with Stripe connect and email template sections"
```

---

## Task 15: 랜딩 페이지

**Files:**
- Create: `components/landing/HeroSection.tsx`
- Create: `components/landing/HowItWorks.tsx`
- Create: `components/landing/PricingSection.tsx`
- Create: `app/(landing)/page.tsx`

**Step 1: HeroSection**

```tsx
// components/landing/HeroSection.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Zap } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="text-center py-24 px-4">
      <Badge variant="outline" className="mb-6 text-sm">
        <Zap className="h-3 w-3 mr-1" /> Stripe 사용자를 위한 Dunning 자동화
      </Badge>
      <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
        5만원으로<br />
        <span className="text-indigo-600">27만원을 되찾으세요</span>
      </h1>
      <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
        결제 실패가 MRR을 조용히 갉아먹고 있습니다.<br />
        RePay가 자동으로 고객에게 연락하고, 복구된 매출을 실시간으로 보여드립니다.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/signup">
          <Button size="lg" className="text-base px-8">
            Stripe 연동하고 무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="#how-it-works">
          <Button size="lg" variant="outline" className="text-base">
            작동 방식 보기
          </Button>
        </Link>
      </div>
      <p className="text-sm text-gray-400 mt-4">신용카드 불필요 · 14일 무료 체험</p>
    </section>
  )
}
```

**Step 2: HowItWorks**

```tsx
// components/landing/HowItWorks.tsx
import { Link2, Mail, BarChart3 } from 'lucide-react'

const steps = [
  {
    icon: Link2,
    title: 'Stripe 연동',
    description: 'Restricted API Key를 입력하면 Webhook이 자동으로 등록됩니다. 5분이면 완료.',
  },
  {
    icon: Mail,
    title: '자동 이메일 발송',
    description: '결제 실패 즉시, 3일 후, 7일 후 — 고객에게 단계적으로 카드 업데이트 안내 이메일이 발송됩니다.',
  },
  {
    icon: BarChart3,
    title: 'ROI 실시간 확인',
    description: '복구된 금액을 대시보드에서 실시간으로 확인하세요. 당신의 투자 대비 수익을 숫자로 증명합니다.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">3단계로 끝납니다</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 mb-4">
                <step.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 3: PricingSection**

```tsx
// components/landing/PricingSection.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check } from 'lucide-react'

const features = [
  '무제한 결제 복구 모니터링',
  '자동 3단계 드립 이메일',
  '실시간 ROI 대시보드',
  'Stripe Webhook 자동 설정',
  '이메일 템플릿 커스터마이징',
  '이메일 지원',
]

export function PricingSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">단순한 요금제</h2>
        <Card className="border-2 border-indigo-500">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-4xl font-extrabold text-gray-900">₩49,000</div>
              <div className="text-gray-500">/월</div>
              <div className="text-sm text-indigo-600 font-medium mt-2">14일 무료 체험 포함</div>
            </div>
            <ul className="space-y-3 mb-8">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/signup">
              <Button className="w-full" size="lg">
                무료로 시작하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
```

**Step 4: 랜딩 페이지**

```tsx
// app/(landing)/page.tsx
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PricingSection } from '@/components/landing/PricingSection'

export default function LandingPage() {
  return (
    <main className="bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-xl font-bold text-gray-900">RePay</span>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">로그인</a>
          <a
            href="/signup"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            무료 시작
          </a>
        </div>
      </nav>
      <HeroSection />
      <HowItWorks />
      <PricingSection />
      <footer className="text-center py-8 text-sm text-gray-400 border-t">
        © 2026 RePay. All rights reserved.
      </footer>
    </main>
  )
}
```

**Step 5: 커밋**

```bash
git add components/landing/ app/'(landing)'/
git commit -m "feat: add landing page with hero, how-it-works, and pricing sections"
```

---

## Task 16: 최종 라우팅 + 검증

**Files:**
- Modify: `app/layout.tsx`
- Modify: `next.config.ts`

**Step 1: Root layout 설정**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RePay — 결제 실패 자동 복구',
  description: 'Stripe 결제 실패를 자동으로 복구하고 ROI를 실시간으로 확인하세요.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: 미들웨어 (인증 세션 갱신)**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 3: TypeScript 빌드 검증**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음. 에러가 있으면 각 에러 메시지에 따라 수정.

**Step 4: 빌드 테스트**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

**Step 5: 개발 서버 최종 확인**

```bash
npm run dev
```

아래 URL 순서로 브라우저에서 확인:
- `http://localhost:3000` → 랜딩 페이지
- `http://localhost:3000/signup` → 회원가입
- `http://localhost:3000/login` → 로그인
- `http://localhost:3000/dashboard` → 대시보드 (로그인 필요)
- `http://localhost:3000/settings` → 설정 페이지

**Step 6: 모든 테스트 통과 확인**

```bash
npx jest --no-coverage
```

Expected: `2 test suites, 6 tests, 0 failures`

**Step 7: 최종 커밋**

```bash
git add .
git commit -m "feat: complete RePay MVP — dunning SaaS with Stripe, QStash, Resend"
```

---

## 환경변수 체크리스트

구현 시작 전 아래 서비스에서 키를 발급받아 `.env.local`을 채워주세요:

| 변수 | 발급 위치 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `RESEND_API_KEY` | resend.com → API Keys |
| `QSTASH_TOKEN` | console.upstash.com → QStash |
| `QSTASH_CURRENT_SIGNING_KEY` | console.upstash.com → QStash |
| `QSTASH_NEXT_SIGNING_KEY` | console.upstash.com → QStash |
| `ENCRYPTION_KEY` | `openssl rand -hex 16` 로컬 생성 |
| `NEXT_PUBLIC_APP_URL` | 로컬: `http://localhost:3000` |

---

## 엣지 케이스 & 주의사항

1. **Stripe Webhook 중복 발송:** `stripe_invoice_id UNIQUE` + `ON CONFLICT DO NOTHING` — DB 레벨에서 원천 차단
2. **이미 복구된 건에 드립 이메일 발송:** `/api/email/send`에서 `status !== 'pending'` 체크로 스킵
3. **QStash 취소 실패:** `catch(console.warn)` — 메시지가 이미 처리됐을 수 있으므로 조용히 실패
4. **Stripe API 키 암호화:** `lib/crypto.ts`의 AES-256-CBC, IV는 매번 랜덤 생성
5. **Service Role vs Anon Key:** webhook handler는 Service Role 사용(RLS 우회), 대시보드는 Anon Key(RLS 적용)
