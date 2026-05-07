"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { AssignChannelDialog } from "@/components/assign-channel-dialog"
import type { Subscription } from "@/lib/youtube"
import type { Category } from "@/db/schema"

function formatSubscriberCount(count: string) {
  const n = parseInt(count, 10)
  if (isNaN(n)) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function SubscriptionList({
  categories,
  assignedMap,
}: {
  categories: Category[]
  assignedMap: Record<string, string[]>
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/youtube/subscriptions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json() as Promise<Subscription[]>
      })
      .then(setSubscriptions)
      .catch(() => setError("Could not load subscriptions. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = subscriptions.filter((s) =>
    s.channelName.toLowerCase().includes(search.toLowerCase())
  )

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search subscriptions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-24" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No subscriptions found.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((sub) => (
            <li
              key={sub.channelId}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {sub.channelThumbnail ? (
                <Image
                  src={sub.channelThumbnail}
                  alt={sub.channelName}
                  width={40}
                  height={40}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{sub.channelName}</p>
                {sub.subscriberCount && (
                  <p className="text-xs text-muted-foreground">
                    {formatSubscriberCount(sub.subscriberCount)} subscribers
                  </p>
                )}
              </div>
              <AssignChannelDialog
                subscription={sub}
                categories={categories}
                assignedCategoryIds={assignedMap[sub.channelId] ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
