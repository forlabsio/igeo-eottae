"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function PaymentFailPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-2xl text-red-600 font-bold">결제가 취소되었습니다</p>
        <Button onClick={() => router.push("/")}>홈으로 돌아가기</Button>
      </div>
    </div>
  )
}
