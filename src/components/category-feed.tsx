"use client"

import { useEffect, useMemo, useState } from "react"
import { EyeOff, Eye } from "lucide-react"
import { VideoCard, ShortCard } from "@/components/video-card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Video } from "@/lib/youtube"

function VideoSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function CategoryFeed({
  categoryId,
  refreshKey = 0,
  activeChannelIds = null,
}: {
  categoryId: string
  refreshKey?: number
  /** When non-null, only videos from these channels are shown */
  activeChannelIds?: string[] | null
}) {
  const [videos, setVideos] = useState<Video[]>([])
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set())
  const [hideWatched, setHideWatched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/youtube/feed?categoryId=${categoryId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json() as Promise<{ videos: Video[]; watchedVideoIds: string[] }>
      })
      .then(({ videos, watchedVideoIds }) => {
        setVideos(videos)
        setWatchedSet(new Set(watchedVideoIds))
      })
      .catch(() => setError("Could not load videos. Please try again."))
      .finally(() => setLoading(false))
  }, [categoryId, refreshKey])

  const { shorts, longForm } = useMemo(() => ({
    shorts: videos.filter((v) => v.isShort),
    longForm: videos.filter((v) => !v.isShort),
  }), [videos])

  const visibleLongForm = useMemo(() => {
    let result = longForm
    if (activeChannelIds?.length) {
      const channelSet = new Set(activeChannelIds)
      result = result.filter((v) => channelSet.has(v.channelId))
    }
    if (hideWatched) result = result.filter((v) => !watchedSet.has(v.videoId))
    return result
  }, [longForm, activeChannelIds, hideWatched, watchedSet])

  const visibleShorts = useMemo(() => {
    let result = shorts
    if (activeChannelIds?.length) {
      const channelSet = new Set(activeChannelIds)
      result = result.filter((v) => channelSet.has(v.channelId))
    }
    if (hideWatched) result = result.filter((v) => !watchedSet.has(v.videoId))
    return result
  }, [shorts, activeChannelIds, hideWatched, watchedSet])

  const watchedCount = useMemo(
    () => videos.filter((v) => watchedSet.has(v.videoId)).length,
    [videos, watchedSet]
  )

  function toggleWatched(videoId: string) {
    setWatchedSet((prev) => {
      const next = new Set(prev)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <VideoSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <p>No videos yet.</p>
        <p className="text-sm mt-1">Add channels to this category to see their latest videos.</p>
      </div>
    )
  }

  const hasNoVisibleVideos = visibleLongForm.length === 0 && visibleShorts.length === 0

  return (
    <div className="space-y-4">
      {watchedCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHideWatched((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              hideWatched
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                : "border-dashed text-muted-foreground hover:border-foreground/50 hover:text-foreground"
            )}
          >
            {hideWatched ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show watched ({watchedCount})
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide watched ({watchedCount})
              </>
            )}
          </button>
        </div>
      )}

      {hasNoVisibleVideos ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {hideWatched ? (
            <>
              <p>All videos are watched.</p>
              <p className="text-sm mt-1">
                <button
                  type="button"
                  onClick={() => setHideWatched(false)}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Show watched videos
                </button>{" "}
                or add more channels.
              </p>
            </>
          ) : (
            <>
              <p>No videos from the selected channels.</p>
              <p className="text-sm mt-1">Choose another channel or click again to include more.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleShorts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Shorts
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {visibleShorts.map((video) => (
                  <div key={video.videoId} className="flex-none w-36">
                    <ShortCard
                      video={video}
                      isWatched={watchedSet.has(video.videoId)}
                      onToggleWatched={() => toggleWatched(video.videoId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleLongForm.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleLongForm.map((video) => (
                <VideoCard
                  key={video.videoId}
                  video={video}
                  isWatched={watchedSet.has(video.videoId)}
                  onToggleWatched={() => toggleWatched(video.videoId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
