"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey")
    const orderId = searchParams.get("orderId")
    const amount = searchParams.get("amount")
    const tier = searchParams.get("tier")

    if (!paymentKey || !orderId || !amount) {
      setStatus("error")
      return
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), tier }),
    })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("Payment verification failed")
      })
      .then((data) => {
        setStatus("success")
        setTimeout(() => router.push(`/dashboard?id=${data.report_id}`), 2000)
      })
      .catch(() => setStatus("error"))
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      {status === "verifying" && <p className="text-xl">결제 확인 중...</p>}
      {status === "success" && (
        <div className="text-center space-y-4">
          <p className="text-2xl text-green-600 font-bold">결제 완료!</p>
          <p className="text-gray-600">분석이 시작됩니다. 대시보드로 이동합니다...</p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center space-y-4">
          <p className="text-2xl text-red-600 font-bold">결제 실패</p>
          <p className="text-gray-600">다시 시도해주세요.</p>
        </div>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>로딩 중...</p></div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
