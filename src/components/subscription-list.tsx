"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { AssignChannelDialog } from "@/components/assign-channel-dialog"
import type { Subscription, SubscriptionPage } from "@/lib/youtube"
import type { Category } from "@/db/schema"

function formatSubscriberCount(count: string) {
  const n = parseInt(count, 10)
  if (isNaN(n)) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function ChannelSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-7 w-20 rounded-md" />
    </li>
  )
}

export function SubscriptionList({
  categories,
  assignedMap,
}: {
  categories: Category[]
  assignedMap: Record<string, string[]>
}) {
  const [items, setItems] = useState<Subscription[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Ref to avoid stale closure in the observer callback
  const nextTokenRef = useRef<string | null>(null)
  const loadingMoreRef = useRef(false)

  const loadPage = useCallback(async (token?: string) => {
    const url = token
      ? `/api/youtube/subscriptions?pageToken=${token}`
      : "/api/youtube/subscriptions"

    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to load")
    return res.json() as Promise<SubscriptionPage>
  }, [])

  // Load the first page on mount
  useEffect(() => {
    loadPage()
      .then(({ items, nextPageToken }) => {
        setItems(items)
        setNextPageToken(nextPageToken)
        nextTokenRef.current = nextPageToken
      })
      .catch(() => setError("Could not load subscriptions. Please try again."))
      .finally(() => setInitialLoading(false))
  }, [loadPage])

  // IntersectionObserver: fires when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          nextTokenRef.current &&
          !loadingMoreRef.current
        ) {
          loadingMoreRef.current = true
          setLoadingMore(true)
          loadPage(nextTokenRef.current)
            .then(({ items: newItems, nextPageToken }) => {
              setItems((prev) => [...prev, ...newItems])
              setNextPageToken(nextPageToken)
              nextTokenRef.current = nextPageToken
            })
            .catch(() => setError("Failed to load more. Please scroll up and try again."))
            .finally(() => {
              loadingMoreRef.current = false
              setLoadingMore(false)
            })
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadPage])

  const filtered = items.filter((s) =>
    s.channelName.toLowerCase().includes(search.toLowerCase())
  )

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search loaded subscriptions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-sm"
      />

      <ul className="space-y-2">
        {initialLoading
          ? Array.from({ length: 8 }).map((_, i) => <ChannelSkeleton key={i} />)
          : filtered.length === 0
          ? null
          : filtered.map((sub) => (
              <li
                key={sub.channelId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <a
                  href={`https://www.youtube.com/channel/${sub.channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  {sub.channelThumbnail ? (
                    <Image
                      src={sub.channelThumbnail}
                      alt={sub.channelName}
                      width={40}
                      height={40}
                      className="rounded-full hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                </a>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://www.youtube.com/channel/${sub.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm truncate hover:underline block"
                  >
                    {sub.channelName}
                  </a>
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

        {!initialLoading && search === "" && filtered.length === 0 && (
          <li className="text-sm text-muted-foreground py-4 text-center">
            No subscriptions found.
          </li>
        )}

        {/* Loading skeletons for next page */}
        {loadingMore &&
          Array.from({ length: 4 }).map((_, i) => <ChannelSkeleton key={`more-${i}`} />)}
      </ul>

      {/* Sentinel — observed to trigger next-page load */}
      <div ref={sentinelRef} className="h-1" aria-hidden />

      {!initialLoading && !nextPageToken && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pb-4">
          All {items.length} subscriptions loaded
        </p>
      )}
    </div>
  )
}
