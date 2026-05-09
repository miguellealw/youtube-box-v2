"use client"

import { useTransition } from "react"
import Image from "next/image"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleWatched } from "@/actions/videos"
import type { Video } from "@/lib/youtube"

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function ShortCard({
  video,
  isWatched = false,
  onToggleWatched,
}: {
  video: Video
  isWatched?: boolean
  onToggleWatched?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggleWatched(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggleWatched?.()
    startTransition(() => toggleWatched(video.videoId, isWatched))
  }

  return (
    <a
      href={`https://www.youtube.com/shorts/${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/80 bg-muted shadow-sm ring-1 ring-foreground/5 transition-all hover:border-border hover:shadow-md hover:ring-primary/10",
        isWatched && "opacity-50 grayscale"
      )}
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="160px"
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* watched toggle */}
        <button
          type="button"
          onClick={handleToggleWatched}
          disabled={isPending}
          aria-label={isWatched ? "Mark as unwatched" : "Mark as watched"}
          className={cn(
            "absolute top-1.5 left-1.5 rounded-full transition-all duration-150 disabled:pointer-events-none",
            "text-white drop-shadow-sm flex items-center gap-1",
            "max-sm:bg-black/40 max-sm:p-1",
            isWatched
              ? "opacity-100 max-sm:pr-2"
              : "opacity-0 group-hover:opacity-80 hover:!opacity-100 max-sm:opacity-70"
          )}
        >
          {isWatched ? (
            <CheckCircle2 className="h-5 w-5 fill-white text-black/60" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          {isWatched && <span className="inline text-xs font-medium leading-none">Watched</span>}
        </button>

        {/* duration badge */}
        {video.durationSeconds !== undefined && (
          <span className="absolute top-1.5 right-1.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium leading-none text-white tabular-nums">
            {formatDuration(video.durationSeconds)}
          </span>
        )}

        {/* text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2 space-y-0.5">
          <p className="text-xs font-semibold text-white line-clamp-2 leading-snug drop-shadow">
            {video.title}
          </p>
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span className="truncate">{video.channelName}</span>
            <span className="shrink-0 ml-1">{formatRelativeTime(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  )
}

export function VideoCard({
  video,
  isWatched = false,
  onToggleWatched,
}: {
  video: Video
  isWatched?: boolean
  onToggleWatched?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggleWatched(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggleWatched?.()
    startTransition(() => toggleWatched(video.videoId, isWatched))
  }

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex flex-col gap-2 overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm ring-foreground/5 ring-1 transition-all hover:border-border hover:shadow-md hover:ring-primary/10",
        isWatched && "opacity-50 grayscale"
      )}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        {video.durationSeconds !== undefined && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium leading-none text-white tabular-nums">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleWatched}
          disabled={isPending}
          aria-label={isWatched ? "Mark as unwatched" : "Mark as watched"}
          className={cn(
            "absolute top-1.5 left-1.5 rounded-full transition-all duration-150 disabled:pointer-events-none",
            "text-white drop-shadow-sm flex items-center gap-1",
            "max-sm:bg-black/40 max-sm:p-1",
            isWatched
              ? "opacity-100 max-sm:pr-2"
              : "opacity-0 group-hover:opacity-80 hover:!opacity-100 max-sm:opacity-70"
          )}
        >
          {isWatched ? (
            <CheckCircle2 className="h-5 w-5 fill-white text-black/60" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          {isWatched && <span className="inline text-xs font-medium leading-none">Watched</span>}
        </button>
      </div>
      <div className="px-3 pb-3 pt-0.5 space-y-1">
        <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {video.title}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{video.channelName}</span>
          <span className="shrink-0 ml-2">{formatRelativeTime(video.publishedAt)}</span>
        </div>
      </div>
    </a>
  )
}
