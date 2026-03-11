# Pre-Check Service with Git — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** GitHub 저장소 보안 취약점 진단 + 바이브 코딩 프롬프트 생성 SaaS (9,900원/건)

**Architecture:** Next.js App + 별도 Worker Docker 서비스를 Railway에 배포. BullMQ/Redis로 분석 잡 큐잉. Semgrep + TruffleHog로 분석 후 맥킨지 스타일 PDF 보고서 생성.

**Tech Stack:** Next.js 14, TypeScript, Prisma + PostgreSQL, BullMQ + Redis, NextAuth.js, Toss Payments, Semgrep, TruffleHog, Puppeteer

---

## Task 1: 프로젝트 초기 세팅

**Files:**
- Create: `/Users/peterchae/precheck-service/` (프로젝트 루트)
- Create: `/Users/peterchae/precheck-service/apps/web/` (Next.js 앱)
- Create: `/Users/peterchae/precheck-service/apps/worker/` (Worker 서비스)

**Step 1: 프로젝트 폴더 및 Next.js 앱 생성**

```bash
mkdir -p /Users/peterchae/precheck-service
cd /Users/peterchae/precheck-service
npx create-next-app@latest apps/web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Expected: Next.js 14 앱이 `apps/web/`에 생성됨

**Step 2: shadcn/ui 초기화**

```bash
cd /Users/peterchae/precheck-service/apps/web
npx shadcn@latest init
# Style: Default, Base color: Slate, CSS variables: Yes
npx shadcn@latest add button card badge progress separator
```

**Step 3: 핵심 패키지 설치**

```bash
cd /Users/peterchae/precheck-service/apps/web
npm install \
  @prisma/client prisma \
  next-auth @auth/prisma-adapter \
  bullmq ioredis \
  @octokit/rest \
  crypto-js @types/crypto-js \
  puppeteer \
  react-dom
npm install -D prisma
```

**Step 4: Worker 패키지 초기화**

```bash
mkdir -p /Users/peterchae/precheck-service/apps/worker
cd /Users/peterchae/precheck-service/apps/worker
npm init -y
npm install bullmq ioredis @prisma/client prisma simple-git puppeteer
npm install -D typescript @types/node ts-node
```

**Step 5: 루트 .gitignore + git 초기화**

```bash
cd /Users/peterchae/precheck-service
git init
cat > .gitignore << 'EOF'
node_modules/
.next/
.env
.env.local
/tmp/
*.pdf
dist/
EOF
```

**Step 6: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add .
git commit -m "chore: initial project setup — Next.js + Worker monorepo"
```

---

## Task 2: Prisma 스키마 + DB 설정

**Files:**
- Create: `apps/web/prisma/schema.prisma`
- Create: `apps/web/.env.local` (gitignore됨)

**Step 1: schema.prisma 작성**

`apps/web/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  githubToken   String?   @db.Text  // AES-256 암호화 저장
  accounts      Account[]
  sessions      Session[]
  jobs          AnalysisJob[]
  payments      Payment[]
  createdAt     DateTime  @default(now())
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model AnalysisJob {
  id           String    @id @default(cuid())
  userId       String
  repoFullName String    // e.g. "peterchae/my-startup"
  repoUrl      String
  status       JobStatus @default(PENDING)
  paymentId    String?
  paidAt       DateTime?
  startedAt    DateTime?
  completedAt  DateTime?
  user         User      @relation(fields: [userId], references: [id])
  result       AnalysisResult?
  payment      Payment?  @relation(fields: [paymentId], references: [id])
  createdAt    DateTime  @default(now())
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

model AnalysisResult {
  id             String      @id @default(cuid())
  jobId          String      @unique
  score          Int         // 0-100
  criticalCount  Int         @default(0)
  highCount      Int         @default(0)
  mediumCount    Int         @default(0)
  lowCount       Int         @default(0)
  semgrepFindings Json       // JSONB
  truffleFindings Json       // JSONB
  reportHtml     String      @db.Text
  reportPdfPath  String?     // Railway Volume 경로
  job            AnalysisJob @relation(fields: [jobId], references: [id])
  createdAt      DateTime    @default(now())
}

model Payment {
  id              String        @id @default(cuid())
  userId          String
  jobId           String?
  tossPaymentKey  String?
  orderId         String        @unique
  amount          Int           // 항상 9900
  status          PaymentStatus @default(PENDING)
  paidAt          DateTime?
  user            User          @relation(fields: [userId], references: [id])
  jobs            AnalysisJob[]
  createdAt       DateTime      @default(now())
}

enum PaymentStatus {
  PENDING
  DONE
  FAILED
  CANCELLED
}
```

**Step 2: .env.local 템플릿 작성**

`apps/web/.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/precheck"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth App
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Toss Payments
TOSS_SECRET_KEY="test_sk_..."
TOSS_CLIENT_KEY="test_ck_..."

# Encryption (GitHub 토큰 암호화용)
ENCRYPTION_KEY="32-char-random-string-here-1234!"

# Reports storage path
REPORTS_DIR="/var/reports"
```

**Step 3: DB 마이그레이션 실행**

```bash
cd /Users/peterchae/precheck-service/apps/web
npx prisma generate
npx prisma db push  # 로컬 dev DB에 적용
```

Expected: `✔ Your database is now in sync with your Prisma schema`

**Step 4: Prisma Client 싱글톤**

`apps/web/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 5: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/prisma/ apps/web/lib/prisma.ts
git commit -m "feat: prisma schema — users, jobs, results, payments"
```

---

## Task 3: GitHub OAuth (NextAuth.js)

**Files:**
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/middleware.ts`

**Step 1: NextAuth 설정**

`apps/web/lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',  // private 레포 접근
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // GitHub access_token을 암호화하여 User 테이블에 저장
      if (account?.provider === 'github' && account.access_token) {
        const encrypted = encryptToken(account.access_token)
        await prisma.user.update({
          where: { id: user.id },
          data: { githubToken: encrypted },
        })
      }
      return true
    },
    async session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
```

**Step 2: API Route 연결**

`apps/web/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Step 3: 보호 미들웨어**

`apps/web/middleware.ts`:

```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/repos', '/payment', '/analysis/:path*', '/report/:path*', '/mypage'],
}
```

**Step 4: 세션 타입 확장**

`apps/web/types/next-auth.d.ts`:

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

**Step 5: 로그인 페이지**

`apps/web/app/login/page.tsx`:

```typescript
'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Pre-Check</h1>
        <p className="text-slate-600">GitHub 저장소 보안 진단 서비스</p>
        <Button
          onClick={() => signIn('github', { callbackUrl: '/repos' })}
          className="bg-slate-900 hover:bg-slate-700"
        >
          GitHub으로 시작하기
        </Button>
      </div>
    </div>
  )
}
```

**Step 6: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/app/api/auth apps/web/lib/auth.ts apps/web/middleware.ts apps/web/types/ apps/web/app/login/
git commit -m "feat: GitHub OAuth via NextAuth.js + route protection middleware"
```

---

## Task 4: 저장소 목록 API + 페이지

**Files:**
- Create: `apps/web/app/api/repos/route.ts`
- Create: `apps/web/app/repos/page.tsx`
- Create: `apps/web/lib/github.ts`

**Step 1: GitHub 토큰 복호화 유틸**

`apps/web/lib/github.ts`:

```typescript
import { Octokit } from '@octokit/rest'
import CryptoJS from 'crypto-js'
import { prisma } from '@/lib/prisma'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

export function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export async function getOctokitForUser(userId: string): Promise<Octokit> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.githubToken) throw new Error('GitHub token not found')
  const token = decryptToken(user.githubToken)
  return new Octokit({ auth: token })
}
```

**Step 2: Repos API Route**

`apps/web/app/api/repos/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOctokitForUser } from '@/lib/github'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const octokit = await getOctokitForUser(session.user.id)
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
      type: 'all',
    })

    const repos = data.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      private: r.private,
      language: r.language,
      updatedAt: r.updated_at,
      url: r.clone_url,
    }))

    return NextResponse.json({ repos })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 })
  }
}
```

**Step 3: 저장소 선택 페이지**

`apps/web/app/repos/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Repo = {
  id: number
  fullName: string
  name: string
  private: boolean
  language: string | null
  updatedAt: string | null
  url: string
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selected, setSelected] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/repos')
      .then((r) => r.json())
      .then(({ repos }) => setRepos(repos))
      .finally(() => setLoading(false))
  }, [])

  function handleAnalyze() {
    if (!selected) return
    const params = new URLSearchParams({
      repo: selected.fullName,
      url: selected.url,
    })
    router.push(`/payment?${params}`)
  }

  if (loading) return <div className="p-8 text-slate-500">저장소 불러오는 중...</div>

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">저장소 선택</h1>
        <p className="text-slate-500 mt-1">분석할 GitHub 저장소를 선택하세요</p>
      </div>
      <div className="space-y-3">
        {repos.map((repo) => (
          <Card
            key={repo.id}
            className={`cursor-pointer border-2 transition-colors ${
              selected?.id === repo.id ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
            }`}
            onClick={() => setSelected(repo)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{repo.fullName}</p>
                <div className="flex gap-2 mt-1">
                  {repo.language && <Badge variant="secondary">{repo.language}</Badge>}
                  {repo.private && <Badge variant="outline">Private</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {selected && (
        <Button
          onClick={handleAnalyze}
          className="w-full bg-slate-900 hover:bg-slate-700"
        >
          {selected.fullName} 분석 시작 — 9,900원
        </Button>
      )}
    </div>
  )
}
```

**Step 4: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/app/api/repos apps/web/app/repos apps/web/lib/github.ts
git commit -m "feat: GitHub repos listing API + repo selection page"
```

---

## Task 5: Toss Payments 결제 플로우

**Files:**
- Create: `apps/web/app/api/payment/prepare/route.ts`
- Create: `apps/web/app/api/payment/confirm/route.ts`
- Create: `apps/web/app/payment/page.tsx`
- Create: `apps/web/app/payment/success/page.tsx`
- Create: `apps/web/lib/toss.ts`

**Step 1: Toss 유틸**

`apps/web/lib/toss.ts`:

```typescript
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const PRODUCT_PRICE = 9900 // 서버 상수 — 절대 프론트에서 받지 않음

export const PRICE = PRODUCT_PRICE

export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Toss confirm failed')
  }
  return res.json()
}

export async function cancelPayment(paymentKey: string, cancelReason: string) {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')
  await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason }),
  })
}
```

**Step 2: 결제 준비 API (pending job 생성)**

`apps/web/app/api/payment/prepare/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PRICE } from '@/lib/toss'
import { nanoid } from 'nanoid'  // npm install nanoid

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { repoFullName, repoUrl } = await req.json()
  if (!repoFullName || !repoUrl) {
    return NextResponse.json({ error: 'Missing repo info' }, { status: 400 })
  }

  const orderId = `precheck-${nanoid(16)}`

  const [payment, job] = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId: session.user.id,
        orderId,
        amount: PRICE,
        status: 'PENDING',
      },
    })
    const job = await tx.analysisJob.create({
      data: {
        userId: session.user.id,
        repoFullName,
        repoUrl,
        status: 'PENDING',
        paymentId: payment.id,
      },
    })
    return [payment, job]
  })

  return NextResponse.json({ orderId, jobId: job.id, amount: PRICE })
}
```

**Step 3: 결제 확인 API (서버사이드 금액 검증)**

`apps/web/app/api/payment/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { confirmPayment, cancelPayment, PRICE } from '@/lib/toss'
import { addAnalysisJob } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentKey, orderId, amount } = await req.json()

  // 1. DB에서 주문 검증
  const payment = await prisma.payment.findUnique({ where: { orderId } })
  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  }

  // 2. 서버사이드 금액 검증 (핵심 보안)
  if (amount !== PRICE || payment.amount !== PRICE) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
  }

  // 3. Toss API 호출
  let tossResult
  try {
    tossResult = await confirmPayment(paymentKey, orderId, PRICE)
  } catch (e: any) {
    await prisma.payment.update({ where: { orderId }, data: { status: 'FAILED' } })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  // 4. Toss 응답 금액 재검증
  if (tossResult.totalAmount !== PRICE) {
    await cancelPayment(paymentKey, '금액 불일치')
    return NextResponse.json({ error: '결제 금액 불일치' }, { status: 400 })
  }

  // 5. 결제 완료 처리 + 잡 큐 등록
  const job = await prisma.analysisJob.findFirst({ where: { paymentId: payment.id } })

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId },
      data: { tossPaymentKey: paymentKey, status: 'DONE', paidAt: new Date() },
    }),
    prisma.analysisJob.update({
      where: { id: job!.id },
      data: { status: 'PENDING', paidAt: new Date() },
    }),
  ])

  // 6. Worker 큐에 잡 등록
  await addAnalysisJob({ jobId: job!.id, userId: session.user.id })

  return NextResponse.json({ jobId: job!.id })
}
```

**Step 4: 결제 페이지 (Toss 위젯)**

`apps/web/app/payment/page.tsx`:

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Toss Payments SDK는 CDN에서 로드
declare const TossPayments: any

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const repo = searchParams.get('repo') || ''
  const repoUrl = searchParams.get('url') || ''
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment'
    document.head.appendChild(script)
  }, [])

  async function handlePay() {
    setLoading(true)
    // 결제 준비
    const res = await fetch('/api/payment/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName: repo, repoUrl }),
    })
    const { orderId, jobId, amount } = await res.json()

    const toss = TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY)
    await toss.requestPayment('카드', {
      amount,
      orderId,
      orderName: `Pre-Check: ${repo}`,
      successUrl: `${window.location.origin}/payment/success?jobId=${jobId}`,
      failUrl: `${window.location.origin}/payment/fail`,
    })
  }

  return (
    <div className="max-w-md mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">결제</h1>
      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <p className="text-sm text-slate-500">분석 대상</p>
        <p className="font-medium text-slate-900">{repo}</p>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-slate-600">보안 분석 + 보고서</span>
          <span className="font-bold text-slate-900">9,900원</span>
        </div>
      </div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? '결제창 여는 중...' : '9,900원 결제하기'}
      </button>
    </div>
  )
}
```

**Step 5: 결제 성공 페이지 (confirm 호출)**

`apps/web/app/payment/success/page.tsx`:

```typescript
'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')!
    const orderId = searchParams.get('orderId')!
    const amount = Number(searchParams.get('amount'))
    const jobId = searchParams.get('jobId')!

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then((r) => r.json())
      .then(({ jobId: confirmedJobId }) => {
        router.replace(`/analysis/${confirmedJobId}`)
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">결제 확인 중...</p>
    </div>
  )
}
```

**Step 6: nanoid 설치 + 커밋**

```bash
cd /Users/peterchae/precheck-service/apps/web
npm install nanoid
git add .
git commit -m "feat: Toss Payments integration — prepare + server-side price validation + confirm"
```

---

## Task 6: BullMQ 큐 설정

**Files:**
- Create: `apps/web/lib/queue.ts`
- Create: `apps/worker/src/queue.ts`

**Step 1: Next.js 앱 큐 프로듀서**

`apps/web/lib/queue.ts`:

```typescript
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const analysisQueue = new Queue('analysis', { connection })

export async function addAnalysisJob(data: { jobId: string; userId: string }) {
  await analysisQueue.add('analyze', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}
```

**Step 2: Worker 큐 컨슈머 진입점**

`apps/worker/src/queue.ts`:

```typescript
import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { runAnalysis } from './pipeline'

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

const worker = new Worker(
  'analysis',
  async (job: Job) => {
    const { jobId, userId } = job.data
    console.log(`[Worker] Starting job ${jobId}`)
    await runAnalysis(jobId, userId)
    console.log(`[Worker] Completed job ${jobId}`)
  },
  {
    connection,
    concurrency: 2,
    limiter: { max: 2, duration: 60000 },
  }
)

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

console.log('[Worker] Listening for jobs...')
```

**Step 3: Worker tsconfig**

`apps/worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 4: Worker package.json scripts**

`apps/worker/package.json`에 scripts 추가:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/queue.js",
    "dev": "ts-node src/queue.ts"
  }
}
```

**Step 5: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/lib/queue.ts apps/worker/
git commit -m "feat: BullMQ queue — producer in Next.js, consumer in Worker"
```

---

## Task 7: Worker Docker 이미지

**Files:**
- Create: `apps/worker/Dockerfile`
- Create: `apps/worker/.dockerignore`

**Step 1: Dockerfile 작성**

`apps/worker/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# 시스템 패키지
RUN apt-get update && apt-get install -y \
    git \
    curl \
    nodejs \
    npm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Semgrep 설치
RUN pip install semgrep --quiet

# TruffleHog 설치
RUN curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin

# Puppeteer 의존성 (Chrome headless)
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node 의존성
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma client
COPY prisma/ ./prisma/
RUN npx prisma generate

# 소스 빌드
COPY . .
RUN npm run build

# 보고서 저장 디렉토리
RUN mkdir -p /var/reports

ENV NODE_ENV=production
CMD ["node", "dist/queue.js"]
```

**Step 2: .dockerignore**

`apps/worker/.dockerignore`:

```
node_modules
dist
.env
*.md
```

**Step 3: 로컬 Docker 빌드 테스트**

```bash
cd /Users/peterchae/precheck-service/apps/worker
docker build -t precheck-worker:test .
```

Expected: 이미지 빌드 성공 (시간 소요 약 3-5분)

**Step 4: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/worker/Dockerfile apps/worker/.dockerignore
git commit -m "feat: Worker Dockerfile — Semgrep + TruffleHog + Puppeteer"
```

---

## Task 8: 분석 파이프라인 + 결과 정규화

**Files:**
- Create: `apps/worker/src/pipeline.ts`
- Create: `apps/worker/src/normalizer.ts`
- Create: `apps/worker/src/scorer.ts`
- Create: `apps/worker/src/vibe-prompt.ts`

**Step 1: 타입 정의**

`apps/worker/src/types.ts`:

```typescript
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface Finding {
  id: string
  title: string
  severity: Severity
  file: string
  line: number
  code: string          // 코드 스니펫
  description: string   // 사용자 친화적 설명
  fixDescription: string
  owasp?: string
  kisa?: string
  vibePrompt: string    // 바이브 코딩 프롬프트
}

export interface SecretFinding {
  id: string
  detectorName: string
  severity: Severity
  file: string
  commit: string
  masked: string        // 실제 값 마스킹
  vibePrompt: string
}
```

**Step 2: Semgrep 실행 + 파싱**

`apps/worker/src/normalizer.ts`:

```typescript
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { Finding, SecretFinding, Severity } from './types'
import { generateFindingPrompt, generateSecretPrompt } from './vibe-prompt'

function semgrepSeverityToEnum(sev: string): Severity {
  const map: Record<string, Severity> = {
    ERROR: 'CRITICAL',
    WARNING: 'HIGH',
    INFO: 'MEDIUM',
    NOTE: 'LOW',
  }
  return map[sev?.toUpperCase()] || 'LOW'
}

export function runSemgrep(repoPath: string): Finding[] {
  try {
    const output = execSync(
      `semgrep --config=p/owasp-top-ten --config=p/secrets --json --quiet ${repoPath}`,
      { timeout: 600000, maxBuffer: 50 * 1024 * 1024 }
    ).toString()

    const result = JSON.parse(output)
    const findings: Finding[] = []
    const seen = new Set<string>()

    for (const r of result.results || []) {
      const key = `${r.path}:${r.start.line}:${r.check_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const finding: Finding = {
        id: randomUUID(),
        title: r.check_id.split('.').pop() || r.check_id,
        severity: semgrepSeverityToEnum(r.extra?.severity),
        file: r.path.replace(repoPath + '/', ''),
        line: r.start.line,
        code: r.extra?.lines || '',
        description: r.extra?.message || '보안 취약점이 탐지되었습니다.',
        fixDescription: r.extra?.fix || '해당 코드를 안전한 방식으로 수정하세요.',
        owasp: r.extra?.metadata?.owasp?.[0],
        kisa: r.extra?.metadata?.references?.[0],
        vibePrompt: '',
      }
      finding.vibePrompt = generateFindingPrompt(finding)
      findings.push(finding)
    }

    return findings
  } catch (e) {
    console.error('[Semgrep] Error:', e)
    return []
  }
}

export function runTrufflehog(repoPath: string): SecretFinding[] {
  try {
    const output = execSync(
      `trufflehog git file://${repoPath} --json --no-update`,
      { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
    ).toString()

    const findings: SecretFinding[] = []
    for (const line of output.split('\n').filter(Boolean)) {
      try {
        const r = JSON.parse(line)
        const raw = r.Raw || ''
        const masked = raw.length > 8
          ? raw.substring(0, 4) + '****' + raw.substring(raw.length - 4)
          : '****'

        const finding: SecretFinding = {
          id: randomUUID(),
          detectorName: r.DetectorName || 'Unknown',
          severity: 'CRITICAL',
          file: r.SourceMetadata?.Data?.Git?.file || 'unknown',
          commit: r.SourceMetadata?.Data?.Git?.commit?.substring(0, 8) || '',
          masked,
          vibePrompt: '',
        }
        finding.vibePrompt = generateSecretPrompt(finding)
        findings.push(finding)
      } catch {}
    }

    return findings
  } catch (e) {
    console.error('[TruffleHog] Error:', e)
    return []
  }
}
```

**Step 3: 점수 계산**

`apps/worker/src/scorer.ts`:

```typescript
import { Finding, SecretFinding } from './types'

export function calculateScore(findings: Finding[], secrets: SecretFinding[]): number {
  const critical = findings.filter((f) => f.severity === 'CRITICAL').length
  const high = findings.filter((f) => f.severity === 'HIGH').length
  const medium = findings.filter((f) => f.severity === 'MEDIUM').length
  const low = findings.filter((f) => f.severity === 'LOW').length
  const secretCount = secrets.length

  const score = Math.max(
    0,
    100 - critical * 25 - high * 10 - medium * 3 - low * 1 - secretCount * 20
  )

  return Math.round(score)
}
```

**Step 4: 바이브 코딩 프롬프트 생성 (핵심 차별점)**

`apps/worker/src/vibe-prompt.ts`:

```typescript
import { Finding, SecretFinding } from './types'

export function generateFindingPrompt(f: Finding): string {
  return `내 코드에서 보안 취약점이 발견됐어. 아래 내용을 보고 안전하게 수정해줘.

**취약점**: ${f.title}
**파일**: ${f.file} (${f.line}번째 줄)
**문제**: ${f.description}
**수정 방향**: ${f.fixDescription}

**현재 코드**:
\`\`\`
${f.code}
\`\`\`

위 코드를 보안 취약점 없이 수정해줘. 수정 전/후 코드를 보여주고, 왜 취약한지도 간단히 설명해줘.`
}

export function generateSecretPrompt(s: SecretFinding): string {
  return `내 Git 저장소에 ${s.detectorName} 비밀정보가 하드코딩된 채로 커밋된 게 발견됐어.

**발견 위치**: ${s.file} (커밋: ${s.commit})
**마스킹된 값**: ${s.masked}

아래 작업을 순서대로 도와줘:
1. 즉시 해당 키/토큰 무효화하는 방법
2. 코드에서 하드코딩 제거하고 환경변수로 교체하는 방법
3. Git 히스토리에서 이 값을 완전히 제거하는 방법 (git filter-repo 사용)`
}
```

**Step 5: 메인 파이프라인**

`apps/worker/src/pipeline.ts`:

```typescript
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { decryptToken } from './crypto'
import { runSemgrep, runTrufflehog } from './normalizer'
import { calculateScore } from './scorer'
import { generateReport } from './report'

const prisma = new PrismaClient()

export async function runAnalysis(jobId: string, userId: string) {
  const tmpDir = path.join('/tmp', jobId)

  try {
    // 1. 잡 + 유저 정보 조회
    const job = await prisma.analysisJob.findUnique({ where: { id: jobId } })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!job || !user?.githubToken) throw new Error('Job or user not found')

    await prisma.analysisJob.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })

    // 2. GitHub 토큰으로 레포 클론
    const token = decryptToken(user.githubToken)
    const cloneUrl = job.repoUrl.replace('https://', `https://x-access-token:${token}@`)
    execSync(`git clone --depth=50 ${cloneUrl} ${tmpDir}`, { timeout: 120000 })

    // 3. 분석 실행
    const semgrepFindings = runSemgrep(tmpDir)
    const truffleFindings = runTrufflehog(tmpDir)

    // 4. 점수 계산
    const score = calculateScore(semgrepFindings, truffleFindings)
    const criticalCount = semgrepFindings.filter((f) => f.severity === 'CRITICAL').length
    const highCount = semgrepFindings.filter((f) => f.severity === 'HIGH').length
    const mediumCount = semgrepFindings.filter((f) => f.severity === 'MEDIUM').length
    const lowCount = semgrepFindings.filter((f) => f.severity === 'LOW').length

    // 5. 보고서 생성
    const { html, pdfPath } = await generateReport({
      job,
      score,
      semgrepFindings,
      truffleFindings,
    })

    // 6. DB 저장
    await prisma.analysisResult.create({
      data: {
        jobId,
        score,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        semgrepFindings: semgrepFindings as any,
        truffleFindings: truffleFindings as any,
        reportHtml: html,
        reportPdfPath: pdfPath,
      },
    })

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  } catch (e: any) {
    console.error(`[Pipeline] Job ${jobId} failed:`, e.message)
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    })
    throw e
  } finally {
    // 7. 임시 파일 삭제 (코드 미보관)
    if (fs.existsSync(tmpDir)) {
      execSync(`rm -rf ${tmpDir}`)
    }
  }
}
```

**Step 6: 암호화 유틸 (Worker용)**

`apps/worker/src/crypto.ts`:

```typescript
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

export function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
```

**Step 7: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/worker/src/
git commit -m "feat: analysis pipeline — Semgrep + TruffleHog + scoring + vibe prompts"
```

---

## Task 9: 맥킨지 스타일 보고서 생성 (HTML + PDF)

**Files:**
- Create: `apps/worker/src/report.ts`
- Create: `apps/worker/src/templates/report.html.ts`

**Step 1: HTML 템플릿**

`apps/worker/src/templates/report.html.ts`:

```typescript
import { Finding, SecretFinding } from '../types'

function severityColor(s: string) {
  const map: Record<string, string> = {
    CRITICAL: '#DC2626',
    HIGH: '#EA580C',
    MEDIUM: '#CA8A04',
    LOW: '#16A34A',
  }
  return map[s] || '#64748B'
}

function severityLabel(s: string) {
  const map: Record<string, string> = {
    CRITICAL: '심각',
    HIGH: '높음',
    MEDIUM: '보통',
    LOW: '낮음',
  }
  return map[s] || s
}

export function buildReportHtml(params: {
  repoName: string
  score: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  semgrepFindings: Finding[]
  truffleFindings: SecretFinding[]
}): string {
  const { repoName, score, criticalCount, highCount, mediumCount, lowCount, semgrepFindings, truffleFindings } = params

  const scoreColor = score >= 80 ? '#16A34A' : score >= 50 ? '#CA8A04' : '#DC2626'
  const topFindings = [...semgrepFindings]
    .sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return order[a.severity] - order[b.severity]
    })
    .slice(0, 3)

  const findingCards = semgrepFindings.map((f) => `
    <div class="finding-card" style="border-left: 4px solid ${severityColor(f.severity)};">
      <div class="finding-header">
        <span class="finding-title">${f.title}</span>
        <span class="badge" style="background:${severityColor(f.severity)}">${severityLabel(f.severity)}</span>
      </div>
      <p class="finding-location">📄 ${f.file} · ${f.line}번째 줄</p>
      <p class="finding-desc">${f.description}</p>
      <div class="code-block"><pre>${escapeHtml(f.code)}</pre></div>
      <div class="fix-section">
        <p class="fix-title">✅ 수정 방법</p>
        <p>${f.fixDescription}</p>
      </div>
      <div class="vibe-section">
        <div class="vibe-header">🤖 AI로 바로 고치기 — 아래 프롬프트를 Claude / ChatGPT에 붙여넣으세요</div>
        <pre class="vibe-prompt">${escapeHtml(f.vibePrompt)}</pre>
      </div>
    </div>
  `).join('')

  const secretCards = truffleFindings.map((s) => `
    <div class="finding-card" style="border-left: 4px solid #DC2626;">
      <div class="finding-header">
        <span class="finding-title">${s.detectorName} 비밀정보 탐지</span>
        <span class="badge" style="background:#DC2626">심각</span>
      </div>
      <p class="finding-location">📄 ${s.file} · 커밋 ${s.commit}</p>
      <p class="finding-desc">하드코딩된 비밀정보가 Git 히스토리에 포함되어 있습니다. 즉시 해당 키를 무효화하고 히스토리에서 제거하세요.</p>
      <p><strong>탐지된 패턴:</strong> <code>${s.masked}</code></p>
      <div class="vibe-section">
        <div class="vibe-header">🤖 AI로 바로 고치기</div>
        <pre class="vibe-prompt">${escapeHtml(s.vibePrompt)}</pre>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 14px; line-height: 1.6; }
    .page { max-width: 900px; margin: 0 auto; padding: 48px; }
    .header { border-bottom: 3px solid #1e293b; padding-bottom: 24px; margin-bottom: 40px; }
    .header h1 { font-size: 28px; font-weight: 700; color: #0f172a; }
    .header .subtitle { color: #64748b; margin-top: 4px; }
    .section-title { font-size: 18px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 32px 0 16px; }
    .score-block { display: flex; align-items: center; gap: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 8px solid ${scoreColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-number { font-size: 32px; font-weight: 800; color: ${scoreColor}; }
    .score-label { font-size: 11px; color: #64748b; }
    .counts { display: flex; gap: 16px; flex-wrap: wrap; }
    .count-badge { padding: 8px 16px; border-radius: 8px; text-align: center; }
    .count-badge .num { font-size: 24px; font-weight: 700; display: block; }
    .count-badge .lbl { font-size: 11px; }
    .top3 { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .top3 h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #c2410c; }
    .top3 li { margin-left: 20px; margin-bottom: 4px; }
    .finding-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .finding-title { font-weight: 600; font-size: 15px; }
    .badge { color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .finding-location { color: #64748b; font-size: 12px; margin-bottom: 8px; }
    .finding-desc { color: #374151; margin-bottom: 12px; }
    .code-block { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 12px; }
    .code-block pre { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; }
    .fix-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
    .fix-title { font-weight: 600; color: #16a34a; margin-bottom: 4px; }
    .vibe-section { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .vibe-header { background: #1e293b; color: #fff; padding: 8px 12px; font-size: 12px; font-weight: 600; }
    .vibe-prompt { padding: 12px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; color: #374151; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 48px; color: #94a3b8; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>보안 진단 보고서</h1>
    <p class="subtitle">${repoName} · 분석일: ${new Date().toLocaleDateString('ko-KR')}</p>
  </div>

  <div class="section-title">Executive Summary</div>
  <div class="score-block">
    <div class="score-circle">
      <span class="score-number">${score}</span>
      <span class="score-label">보안 점수</span>
    </div>
    <div>
      <div class="counts">
        <div class="count-badge" style="background:#fef2f2"><span class="num" style="color:#dc2626">${criticalCount}</span><span class="lbl" style="color:#dc2626">심각</span></div>
        <div class="count-badge" style="background:#fff7ed"><span class="num" style="color:#ea580c">${highCount}</span><span class="lbl" style="color:#ea580c">높음</span></div>
        <div class="count-badge" style="background:#fefce8"><span class="num" style="color:#ca8a04">${mediumCount}</span><span class="lbl" style="color:#ca8a04">보통</span></div>
        <div class="count-badge" style="background:#f0fdf4"><span class="num" style="color:#16a34a">${lowCount}</span><span class="lbl" style="color:#16a34a">낮음</span></div>
      </div>
      ${topFindings.length > 0 ? `
      <div class="top3">
        <h3>주요 개선 항목 Top ${topFindings.length}</h3>
        <ul>${topFindings.map((f) => `<li>${f.title} — ${f.file}:${f.line}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  </div>

  ${semgrepFindings.length > 0 ? `
  <div class="section-title">취약점 상세 분석</div>
  ${findingCards}` : '<div class="section-title">✅ 코드 취약점 없음</div>'}

  ${truffleFindings.length > 0 ? `
  <div class="section-title">비밀정보 탐지 결과 — 즉시 조치 필요</div>
  ${secretCards}` : ''}

  <div class="footer">
    Pre-Check Security Report · OWASP Top 10 + KISA 보안약점 기반 · 이 보고서는 자동화된 분석 결과입니다
  </div>
</div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

**Step 2: PDF 생성**

`apps/worker/src/report.ts`:

```typescript
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { buildReportHtml } from './templates/report.html'
import { Finding, SecretFinding } from './types'
import { AnalysisJob } from '@prisma/client'

const REPORTS_DIR = process.env.REPORTS_DIR || '/var/reports'

export async function generateReport(params: {
  job: AnalysisJob
  score: number
  semgrepFindings: Finding[]
  truffleFindings: SecretFinding[]
}): Promise<{ html: string; pdfPath: string }> {
  const { job, score, semgrepFindings, truffleFindings } = params

  const criticalCount = semgrepFindings.filter((f) => f.severity === 'CRITICAL').length
  const highCount = semgrepFindings.filter((f) => f.severity === 'HIGH').length
  const mediumCount = semgrepFindings.filter((f) => f.severity === 'MEDIUM').length
  const lowCount = semgrepFindings.filter((f) => f.severity === 'LOW').length

  const html = buildReportHtml({
    repoName: job.repoFullName,
    score,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    semgrepFindings,
    truffleFindings,
  })

  // PDF 파일명: {username}-{repo}.pdf
  const [username, repoName] = job.repoFullName.split('/')
  const fileName = `${username}-${repoName}.pdf`
  const pdfPath = path.join(REPORTS_DIR, fileName)

  fs.mkdirSync(REPORTS_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  })
  await browser.close()

  return { html, pdfPath }
}
```

**Step 3: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/worker/src/report.ts apps/worker/src/templates/
git commit -m "feat: McKinsey-style HTML/PDF report + vibe coding prompts"
```

---

## Task 10: 분석 상태 폴링 + 보고서 뷰어 페이지

**Files:**
- Create: `apps/web/app/api/jobs/[id]/route.ts`
- Create: `apps/web/app/api/jobs/[id]/pdf/route.ts`
- Create: `apps/web/app/analysis/[jobId]/page.tsx`
- Create: `apps/web/app/report/[jobId]/page.tsx`

**Step 1: 잡 상태 API**

`apps/web/app/api/jobs/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await prisma.analysisJob.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { result: { select: { score: true, criticalCount: true, highCount: true, mediumCount: true, lowCount: true } } },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: job.id,
    status: job.status,
    repoFullName: job.repoFullName,
    score: job.result?.score,
  })
}
```

**Step 2: PDF 다운로드 API**

`apps/web/app/api/jobs/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await prisma.analysisJob.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { result: true },
  })

  if (!job?.result?.reportPdfPath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pdfBuffer = fs.readFileSync(job.result.reportPdfPath)
  const fileName = path.basename(job.result.reportPdfPath)

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
```

**Step 3: 분석 진행 중 페이지**

`apps/web/app/analysis/[jobId]/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'

const STEPS = ['결제 확인 중', 'Semgrep 분석 중', 'TruffleHog 스캔 중', '보고서 생성 중']

export default function AnalysisPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [status, setStatus] = useState('PENDING')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`)
      const data = await res.json()
      setStatus(data.status)
      setStep((s) => Math.min(s + 1, STEPS.length - 1))

      if (data.status === 'COMPLETED') {
        clearInterval(interval)
        router.push(`/report/${jobId}`)
      } else if (data.status === 'FAILED') {
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [jobId])

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-2xl animate-spin">
          🔍
        </div>
        <h1 className="text-xl font-bold text-slate-900">보안 분석 중...</h1>
        <p className="text-slate-500">{STEPS[Math.min(step, STEPS.length - 1)]}</p>
        <Progress value={progress} className="h-2" />
        {status === 'FAILED' && (
          <p className="text-red-600">분석 중 오류가 발생했습니다. 고객센터에 문의해 주세요.</p>
        )}
        <p className="text-sm text-slate-400">보통 3~10분 소요됩니다</p>
      </div>
    </div>
  )
}
```

**Step 4: 보고서 뷰어 페이지**

`apps/web/app/report/[jobId]/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ReportPage({ params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const job = await prisma.analysisJob.findFirst({
    where: { id: params.jobId, userId: session.user.id },
    include: { result: true },
  })

  if (!job?.result) redirect('/mypage')

  return (
    <div>
      <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold">{job.repoFullName} 보안 진단 결과</h1>
          <p className="text-slate-400 text-sm">보안 점수: {job.result.score}점</p>
        </div>
        <div className="flex gap-3">
          <Link href="/mypage">
            <Button variant="outline" className="text-white border-white hover:bg-slate-700">마이페이지</Button>
          </Link>
          <a href={`/api/jobs/${params.jobId}/pdf`} download>
            <Button className="bg-white text-slate-900 hover:bg-slate-100">PDF 다운로드</Button>
          </a>
        </div>
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: job.result.reportHtml }}
        className="report-content"
      />
    </div>
  )
}
```

**Step 5: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/app/api/jobs apps/web/app/analysis apps/web/app/report
git commit -m "feat: job status polling + report viewer + PDF download API"
```

---

## Task 11: 마이페이지 (영구 재다운로드)

**Files:**
- Create: `apps/web/app/api/my/reports/route.ts`
- Create: `apps/web/app/mypage/page.tsx`

**Step 1: 마이페이지 API**

`apps/web/app/api/my/reports/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobs = await prisma.analysisJob.findMany({
    where: { userId: session.user.id, status: 'COMPLETED' },
    include: {
      result: { select: { score: true, criticalCount: true, highCount: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  return NextResponse.json({ jobs })
}
```

**Step 2: 마이페이지 UI**

`apps/web/app/mypage/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function MyPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const jobs = await prisma.analysisJob.findMany({
    where: { userId: session.user.id, status: 'COMPLETED' },
    include: { result: { select: { score: true, criticalCount: true, highCount: true } } },
    orderBy: { completedAt: 'desc' },
  })

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">내 분석 이력</h1>
      {jobs.length === 0 ? (
        <p className="text-slate-500">분석 이력이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{job.repoFullName}</p>
                  <div className="flex gap-2 mt-1 items-center">
                    <Badge className="bg-slate-900">점수 {job.result?.score ?? '-'}</Badge>
                    {(job.result?.criticalCount ?? 0) > 0 && (
                      <Badge variant="destructive">심각 {job.result!.criticalCount}</Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {job.completedAt?.toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/report/${job.id}`}>
                    <Button variant="outline" size="sm">보고서 보기</Button>
                  </Link>
                  <a href={`/api/jobs/${job.id}/pdf`} download>
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-700">PDF 다운로드</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/app/api/my apps/web/app/mypage
git commit -m "feat: mypage — analysis history + permanent PDF re-download"
```

---

## Task 12: 랜딩 페이지

**Files:**
- Modify: `apps/web/app/page.tsx`

**Step 1: 랜딩 페이지**

`apps/web/app/page.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 py-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-1 rounded-full text-sm text-slate-600">
          🔐 런칭 전 필수 보안 점검
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight">
          GitHub 저장소<br />보안 취약점 진단
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Semgrep + TruffleHog으로 코드를 분석하고,<br />
          AI가 바로 수정할 수 있는 프롬프트까지 제공합니다.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/repos">
            <Button className="bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 text-lg h-auto">
              지금 진단하기 — 9,900원
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-3 gap-8">
          {[
            { icon: '🔍', title: 'OWASP Top 10 분석', desc: 'SQL Injection, XSS, 인증 이슈 등 주요 취약점 자동 탐지' },
            { icon: '🔑', title: '비밀정보 탐지', desc: 'API 키, 토큰 등 Git 히스토리까지 스캔' },
            { icon: '🤖', title: '바이브 코딩 프롬프트', desc: '각 취약점마다 AI에 바로 붙여넣을 수 있는 수정 프롬프트 제공' },
          ].map((f) => (
            <div key={f.title} className="text-center space-y-3">
              <div className="text-4xl">{f.icon}</div>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-slate-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-8 py-20 text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">단 9,900원으로 런칭 전 보안 점검</h2>
        <p className="text-slate-500">맥킨지 스타일 PDF 보고서 + 바이브 코딩 프롬프트 포함</p>
        <Link href="/repos">
          <Button className="bg-slate-900 hover:bg-slate-700 text-white px-8 py-3 text-lg h-auto mt-4">
            GitHub 연동하고 시작하기
          </Button>
        </Link>
      </div>
    </main>
  )
}
```

**Step 2: 커밋**

```bash
cd /Users/peterchae/precheck-service
git add apps/web/app/page.tsx
git commit -m "feat: landing page — hero + features + CTA"
```

---

## Task 13: Railway 배포 설정

**Files:**
- Create: `apps/web/railway.json`
- Create: `apps/worker/railway.json`
- Create: `.env.example`

**Step 1: Web 서비스 Railway 설정**

`apps/web/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && npm start",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 2: Worker 서비스 Railway 설정**

`apps/worker/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 3: 헬스체크 API**

`apps/web/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

**Step 4: 환경변수 예시 파일**

`.env.example`:

```bash
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://your-app.railway.app

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Redis (Railway Redis)
REDIS_URL=redis://...

# Toss Payments
TOSS_SECRET_KEY=live_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_...

# Encryption (32자 랜덤 문자열)
ENCRYPTION_KEY=

# Reports Volume
REPORTS_DIR=/var/reports
```

**Step 5: Railway 배포 순서**

```bash
# 1. Railway CLI 설치 확인
railway --version

# 2. 로그인
railway login

# 3. 새 프로젝트 생성
railway new

# 4. PostgreSQL + Redis 추가 (Railway Dashboard에서)

# 5. Web 서비스 배포
cd apps/web && railway up --detach

# 6. Worker 서비스 배포 (별도 서비스로)
cd ../worker && railway up --detach

# 7. 환경변수 Railway Dashboard에서 설정
```

**Step 6: 최종 커밋**

```bash
cd /Users/peterchae/precheck-service
git add .
git commit -m "chore: Railway deployment config + health check + env example"
```

---

## 완료 체크리스트

- [ ] Task 1: 프로젝트 초기 세팅
- [ ] Task 2: Prisma 스키마 + DB
- [ ] Task 3: GitHub OAuth (NextAuth)
- [ ] Task 4: 저장소 목록 API + 페이지
- [ ] Task 5: Toss Payments 결제 플로우
- [ ] Task 6: BullMQ 큐 설정
- [ ] Task 7: Worker Docker 이미지
- [ ] Task 8: 분석 파이프라인
- [ ] Task 9: 맥킨지 스타일 보고서 + PDF
- [ ] Task 10: 분석 상태 폴링 + 보고서 뷰어
- [ ] Task 11: 마이페이지 영구 재다운로드
- [ ] Task 12: 랜딩 페이지
- [ ] Task 13: Railway 배포 설정
