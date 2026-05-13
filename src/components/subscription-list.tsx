"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import { useDraggable } from "@dnd-kit/core"
import { GripVertical, LayoutGrid, LayoutList } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AssignChannelDialog } from "@/components/assign-channel-dialog"
import { ChannelInfoDialog } from "@/components/channel-info-dialog"
import { cn } from "@/lib/utils"
import type { Subscription, SubscriptionPage } from "@/lib/youtube"
import type { Category } from "@/db/schema"

/** YouTube pages can overlap; React keys must be unique per channel. */
function dedupeSubscriptionsByChannelId(items: Subscription[]): Subscription[] {
  const seen = new Set<string>()
  const out: Subscription[] = []
  for (const s of items) {
    if (seen.has(s.channelId)) continue
    seen.add(s.channelId)
    out.push(s)
  }
  return out
}

function formatSubscriberCount(count: string) {
  const n = parseInt(count, 10)
  if (isNaN(n)) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function useIsDesktopDnD() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const apply = () => setOk(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return ok
}

function DraggableGrip({ subscription }: { subscription: Subscription }) {
  const isDesktop = useIsDesktopDnD()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subscription-${subscription.channelId}`,
    data: { type: "subscription", subscription },
    disabled: !isDesktop,
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`hidden md:inline-flex shrink-0 h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${subscription.channelName} to a category in the sidebar`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}

const SUBS_LAYOUT_KEY = "youtube-box:subs-layout"
type SubsLayout = "stacked" | "grid"

function ChannelSkeletonStacked() {
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <Skeleton className="hidden md:block h-9 w-9 rounded-md shrink-0" />
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-7 w-20 rounded-md" />
    </li>
  )
}

function ChannelSkeletonGrid() {
  return (
    <li className="flex flex-col items-center rounded-lg border p-4 pt-9 gap-3">
      <Skeleton className="h-14 w-14 rounded-full shrink-0" />
      <div className="w-full space-y-2 flex flex-col items-center">
        <Skeleton className="h-4 w-3/4 max-w-[9rem]" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-8 w-full max-w-[7rem] rounded-md" />
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
  const [layout, setLayout] = useState<SubsLayout>("stacked")
  const [fetchingAll, setFetchingAll] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Ref to avoid stale closure in the observer callback
  const nextTokenRef = useRef<string | null>(null)
  const loadingMoreRef = useRef(false)
  const fetchingAllRef = useRef(false)

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
        setItems(dedupeSubscriptionsByChannelId(items))
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
          !loadingMoreRef.current &&
          !fetchingAllRef.current
        ) {
          loadingMoreRef.current = true
          setLoadingMore(true)
          loadPage(nextTokenRef.current)
            .then(({ items: newItems, nextPageToken }) => {
              setItems((prev) =>
                dedupeSubscriptionsByChannelId([...prev, ...newItems])
              )
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

  // When user searches and there are unloaded pages, fetch all remaining pages
  useEffect(() => {
    if (!search || !nextTokenRef.current || fetchingAllRef.current) return

    let cancelled = false
    fetchingAllRef.current = true
    setFetchingAll(true)

    const fetchAll = async () => {
      let token = nextTokenRef.current
      while (token && !cancelled) {
        const page = await loadPage(token)
        if (cancelled) break
        setItems((prev) => dedupeSubscriptionsByChannelId([...prev, ...page.items]))
        token = page.nextPageToken
        nextTokenRef.current = page.nextPageToken
        setNextPageToken(page.nextPageToken)
      }
    }

    fetchAll()
      .catch(() => { if (!cancelled) setError("Failed to load all subscriptions for search.") })
      .finally(() => {
        fetchingAllRef.current = false
        setFetchingAll(false)
      })

    return () => { cancelled = true }
  }, [search, loadPage])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBS_LAYOUT_KEY)
      if (raw === "grid" || raw === "stacked") setLayout(raw)
    } catch {
      /* ignore */
    }
  }, [])

  const setLayoutPersist = useCallback((next: SubsLayout) => {
    setLayout(next)
    try {
      localStorage.setItem(SUBS_LAYOUT_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const filtered = items.filter((s) =>
    s.channelName.toLowerCase().includes(search.toLowerCase())
  )

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  const ChannelSkeletonCmp =
    layout === "grid" ? ChannelSkeletonGrid : ChannelSkeletonStacked
  const listClass =
    layout === "grid"
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      : "flex flex-col gap-2"

  return (
    <div>
      <div
        className={cn(
          "sticky top-0 z-30 -mx-4 px-4 pb-3 pt-4 md:-mx-6 md:px-6 md:pt-5",
          "mb-4 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
          "border-b border-border/80"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Input
            placeholder="Search subscriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <div
            className="inline-flex rounded-lg border bg-muted/30 p-0.5 self-start sm:self-auto"
            role="group"
            aria-label="Subscription layout"
          >
            <Button
              type="button"
              size="icon-sm"
              variant={layout === "stacked" ? "secondary" : "ghost"}
              className={layout === "stacked" ? "shadow-none" : undefined}
              onClick={() => setLayoutPersist("stacked")}
              aria-pressed={layout === "stacked"}
              aria-label="Stacked list"
            >
              <LayoutList className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={layout === "grid" ? "secondary" : "ghost"}
              className={layout === "grid" ? "shadow-none" : undefined}
              onClick={() => setLayoutPersist("grid")}
              aria-pressed={layout === "grid"}
              aria-label="Grid"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>

        <p className="hidden md:block text-xs text-muted-foreground mt-3">
          Drag the handle next to a channel onto a category in the sidebar.
        </p>

        {fetchingAll && (
          <span className="text-xs text-muted-foreground animate-pulse mt-1 block">
            Loading all subscriptions…
          </span>
        )}
      </div>

      <ul className={listClass}>
        {initialLoading
          ? Array.from({ length: 8 }).map((_, i) => <ChannelSkeletonCmp key={i} />)
          : filtered.length === 0
          ? null
          : filtered.map((sub) =>
              layout === "grid" ? (
                <li
                  key={sub.channelId}
                  className="relative flex flex-col items-center overflow-visible rounded-lg border pt-11 pb-3 px-3 gap-2 text-center"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex w-full items-start justify-end gap-2 px-1 md:justify-between [&>*]:pointer-events-auto">
                    <DraggableGrip subscription={sub} />
                    <AssignChannelDialog
                      subscription={sub}
                      categories={categories}
                      assignedCategoryIds={assignedMap[sub.channelId] ?? []}
                      triggerVariant="compact"
                    />
                  </div>
                  <ChannelInfoDialog
                    subscription={sub}
                    categories={categories}
                    assignedCategoryIds={assignedMap[sub.channelId] ?? []}
                  >
                    <div className="shrink-0 cursor-pointer">
                      {sub.channelThumbnail ? (
                        <Image
                          src={sub.channelThumbnail}
                          alt={sub.channelName}
                          width={56}
                          height={56}
                          sizes="56px"
                          className="size-14 rounded-full hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <span className="font-medium text-sm line-clamp-2 hover:underline cursor-pointer">
                        {sub.channelName}
                      </span>
                      {sub.subscriberCount && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatSubscriberCount(sub.subscriberCount)} subs
                        </p>
                      )}
                    </div>
                  </ChannelInfoDialog>
                </li>
              ) : (
                <li
                  key={sub.channelId}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <DraggableGrip subscription={sub} />
                  <ChannelInfoDialog
                    subscription={sub}
                    categories={categories}
                    assignedCategoryIds={assignedMap[sub.channelId] ?? []}
                  >
                    <div className="shrink-0 cursor-pointer">
                      {sub.channelThumbnail ? (
                        <Image
                          src={sub.channelThumbnail}
                          alt={sub.channelName}
                          width={40}
                          height={40}
                          sizes="40px"
                          className="size-10 rounded-full hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate hover:underline block cursor-pointer">
                        {sub.channelName}
                      </span>
                      {sub.subscriberCount && (
                        <p className="text-xs text-muted-foreground">
                          {formatSubscriberCount(sub.subscriberCount)} subscribers
                        </p>
                      )}
                    </div>
                  </ChannelInfoDialog>
                  <AssignChannelDialog
                    subscription={sub}
                    categories={categories}
                    assignedCategoryIds={assignedMap[sub.channelId] ?? []}
                  />
                </li>
              )
            )}

        {!initialLoading && search === "" && filtered.length === 0 && (
          <li className="text-sm text-muted-foreground py-4 text-center col-span-full">
            No subscriptions found.
          </li>
        )}

        {/* Loading skeletons for next page */}
        {loadingMore &&
          Array.from({ length: 4 }).map((_, i) => (
            <ChannelSkeletonCmp key={`more-${i}`} />
          ))}
      </ul>

      {/* Sentinel — observed to trigger next-page load */}
      <div ref={sentinelRef} className="h-1" aria-hidden />

      {!initialLoading && !nextPageToken && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
          All {items.length} subscriptions loaded
        </p>
      )}
    </div>
  )
}
