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
            "text-white drop-shadow-sm",
            isWatched
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-80 hover:!opacity-100"
          )}
        >
          {isWatched ? (
            <CheckCircle2 className="h-5 w-5 fill-white text-black/60" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
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
