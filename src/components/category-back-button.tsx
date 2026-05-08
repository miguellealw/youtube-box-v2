"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

export function CategoryBackButton() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/categories")
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      Go Back
    </button>
  )
}
