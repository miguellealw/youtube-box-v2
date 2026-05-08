"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function useScrollRestoration<T extends HTMLElement>() {
  const pathname = usePathname()
  const ref = useRef<T>(null)
  // Tracks whether we're in the middle of a restoration so scroll events
  // during the programmatic scroll don't overwrite the saved position with 0.
  const restoringRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const key = `scroll:${pathname}`

    const save = () => {
      if (!restoringRef.current) {
        sessionStorage.setItem(key, String(el.scrollTop))
      }
    }
    el.addEventListener("scroll", save, { passive: true })

    const saved = sessionStorage.getItem(key)
    const target = saved ? parseInt(saved, 10) : 0

    const timers: ReturnType<typeof setTimeout>[] = []
    let rafId: number

    if (target > 0) {
      restoringRef.current = true

      const tryRestore = () => {
        // scrollTo with instant behavior works more reliably on iOS Safari
        // than direct scrollTop assignment.
        el.scrollTo({ top: target, behavior: "instant" })
        if (el.scrollTop >= target - 1) {
          restoringRef.current = false
        }
      }

      // Try at multiple points because Server Component content may stream in
      // after the first attempt, leaving scrollHeight too small to reach the
      // target. Each retry catches a later paint cycle.
      tryRestore()
      rafId = requestAnimationFrame(tryRestore)
      timers.push(
        setTimeout(tryRestore, 50),
        setTimeout(tryRestore, 150),
        setTimeout(() => {
          tryRestore()
          restoringRef.current = false
        }, 500),
      )
    }

    return () => {
      // Save the current position before the pathname changes so we capture
      // the exact scroll state right as the user leaves this route.
      sessionStorage.setItem(key, String(el.scrollTop))
      restoringRef.current = false
      el.removeEventListener("scroll", save)
      cancelAnimationFrame(rafId)
      timers.forEach(clearTimeout)
    }
  }, [pathname])

  return ref
}
