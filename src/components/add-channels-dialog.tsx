"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { assignChannel, removeChannel } from "@/actions/channels"
import { Plus, Check, Loader2, ListPlus } from "lucide-react"
import { toast } from "sonner"
import type { Subscription, SubscriptionPage } from "@/lib/youtube"

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
      <Skeleton className="h-8 w-16 rounded-md" />
    </li>
  )
}

export function AddChannelsDialog({
  categoryId,
  initialAssignedIds,
  onChannelChange,
}: {
  categoryId: string
  initialAssignedIds: string[]
  onChannelChange?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Subscription[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [assigned, setAssigned] = useState(new Set(initialAssignedIds))
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextTokenRef = useRef<string | null>(null)
  const loadingMoreRef = useRef(false)
  const loadingAllRef = useRef(false)
  const hasLoaded = useRef(false)
  const router = useRouter()

  const loadPage = useCallback(async (token?: string) => {
    const url = token
      ? `/api/youtube/subscriptions?pageToken=${token}`
      : "/api/youtube/subscriptions"
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to load")
    return res.json() as Promise<SubscriptionPage>
  }, [])

  useEffect(() => {
    if (!open || hasLoaded.current) return
    hasLoaded.current = true
    setInitialLoading(true)
    loadPage()
      .then(({ items, nextPageToken }) => {
        setItems(items)
        setNextPageToken(nextPageToken)
        nextTokenRef.current = nextPageToken
      })
      .catch(() => setError("Could not load subscriptions. Please try again."))
      .finally(() => setInitialLoading(false))
  }, [open, loadPage])

  const loadAll = useCallback(async () => {
    if (loadingAllRef.current || !nextTokenRef.current) return
    loadingAllRef.current = true
    setLoadingAll(true)
    try {
      let token: string | null = nextTokenRef.current
      while (token) {
        const { items: newItems, nextPageToken } = await loadPage(token)
        setItems((prev) => [...prev, ...newItems])
        setNextPageToken(nextPageToken)
        nextTokenRef.current = nextPageToken
        token = nextPageToken
      }
    } catch {
      setError("Failed to load all subscriptions. Search results may be incomplete.")
    } finally {
      loadingAllRef.current = false
      setLoadingAll(false)
    }
  }, [loadPage])

  useEffect(() => {
    if (search && nextTokenRef.current && !loadingAllRef.current) {
      loadAll()
    }
  }, [search, loadAll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || loadingMoreRef.current || loadingAllRef.current || !nextTokenRef.current) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadingMoreRef.current = true
      setLoadingMore(true)
      loadPage(nextTokenRef.current)
        .then(({ items: newItems, nextPageToken }) => {
          setItems((prev) => [...prev, ...newItems])
          setNextPageToken(nextPageToken)
          nextTokenRef.current = nextPageToken
        })
        .catch(() => setError("Failed to load more. Please try again."))
        .finally(() => {
          loadingMoreRef.current = false
          setLoadingMore(false)
        })
    }
  }, [loadPage])

  async function toggle(sub: Subscription) {
    if (pendingId) return
    setPendingId(sub.channelId)
    try {
      if (assigned.has(sub.channelId)) {
        const result = await removeChannel(sub.channelId, categoryId)
        if (result.success) {
          setAssigned((prev) => {
            const next = new Set(prev)
            next.delete(sub.channelId)
            return next
          })
          toast.success(`Removed ${sub.channelName}`)
          onChannelChange?.()
          router.refresh()
        }
      } else {
        const result = await assignChannel(categoryId, {
          channelId: sub.channelId,
          channelName: sub.channelName,
          channelThumbnail: sub.channelThumbnail,
          subscriberCount: sub.subscriberCount,
        })
        if (result.success) {
          setAssigned((prev) => new Set([...prev, sub.channelId]))
          toast.success(`Added ${sub.channelName}`)
          onChannelChange?.()
          router.refresh()
        }
      }
    } finally {
      setPendingId(null)
    }
  }

  const filtered = items.filter((s) =>
    s.channelName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
          />
        }
      >
        <ListPlus className="h-3.5 w-3.5" />
        Add channels
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[80vh] overflow-hidden sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add channels to category</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search subscriptions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4"
        >
          {error && <p className="text-sm text-destructive py-2">{error}</p>}
          <ul className="space-y-1.5 pb-2">
            {initialLoading
              ? Array.from({ length: 6 }).map((_, i) => <ChannelSkeleton key={i} />)
              : filtered.map((sub) => {
                  const isAdded = assigned.has(sub.channelId)
                  const isPending = pendingId === sub.channelId
                  return (
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
                          sizes="40px"
                          className="size-10 rounded-full shrink-0"
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
                      <Button
                        variant={isAdded ? "secondary" : "outline"}
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => toggle(sub)}
                        disabled={!!pendingId}
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isAdded ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {isAdded ? "Added" : "Add"}
                      </Button>
                    </li>
                  )
                })}
            {(loadingMore || loadingAll) &&
              Array.from({ length: 3 }).map((_, i) => (
                <ChannelSkeleton key={`more-${i}`} />
              ))}
          </ul>
          {loadingAll && (
            <p className="text-center text-xs text-muted-foreground pb-4">
              Loading all subscriptions…
            </p>
          )}
          {!initialLoading && !loadingAll && !nextPageToken && items.length > 0 && (
            <p className="text-center text-xs text-muted-foreground pb-4">
              All {items.length} subscriptions loaded
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
