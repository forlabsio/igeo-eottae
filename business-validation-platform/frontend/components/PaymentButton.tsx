"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const TIER_PRICES = {
  basic: { amount: 99000, name: "빠른 검증" },
  pro: { amount: 299000, name: "심층 분석" },
  premium: { amount: 999000, name: "전략+실행" },
}

interface PaymentButtonProps {
  tier: "basic" | "pro" | "premium"
  onSuccess: (paymentKey: string, orderId: string) => void
  disabled?: boolean
}

export function PaymentButton({ tier, onSuccess, disabled }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const tierInfo = TIER_PRICES[tier]

  const handlePayment = async () => {
    setLoading(true)
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk")
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_ck_placeholder"
      )
      const payment = tossPayments.payment({ customerKey: `customer-${Date.now()}` })
      const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      await payment.requestPayment({
        method: "카드",
        amount: { currency: "KRW", value: tierInfo.amount },
        orderId,
        orderName: `비즈니스 검증 - ${tierInfo.name}`,
        successUrl: `${window.location.origin}/payment/success?tier=${tier}`,
        failUrl: `${window.location.origin}/payment/fail`,
      })
    } catch (error) {
      console.error("Payment error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} disabled={disabled || loading} className="w-full">
      {loading ? "결제 중..." : `₩${tierInfo.amount.toLocaleString()} 결제하기`}
    </Button>
  )
}
