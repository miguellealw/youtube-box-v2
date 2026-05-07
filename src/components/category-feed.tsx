"use client"

import { useEffect, useState } from "react"
import { VideoCard } from "@/components/video-card"
import { Skeleton } from "@/components/ui/skeleton"
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

export function CategoryFeed({ categoryId }: { categoryId: string }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/youtube/feed?categoryId=${categoryId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json() as Promise<Video[]>
      })
      .then(setVideos)
      .catch(() => setError("Could not load videos. Please try again."))
      .finally(() => setLoading(false))
  }, [categoryId])

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
        <p className="text-sm mt-1">
          Add channels to this category from the{" "}
          <a href="/subscriptions" className="underline hover:text-foreground">
            Subscriptions
          </a>{" "}
          page.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <VideoCard key={video.videoId} video={video} />
      ))}
    </div>
  )
}
