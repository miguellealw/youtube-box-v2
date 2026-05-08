import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels, watchedVideos } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getAccessToken } from "@/lib/tokens"
import { fetchUploadsPlaylistId, fetchRecentVideos } from "@/lib/youtube"
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"
import type { Video } from "@/lib/youtube"

/** Long-form candidates per channel before merge (single playlist page maxes at 50 items). */
const CANDIDATES_PER_CHANNEL = 20
/** Total videos returned after global sort by upload time. */
const MAX_FEED_VIDEOS = 50

function publishedTimestamp(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

function compareByUploadTime(a: Video, b: Video): number {
  const dt = publishedTimestamp(b.publishedAt) - publishedTimestamp(a.publishedAt)
  if (dt !== 0) return dt
  return a.videoId.localeCompare(b.videoId)
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const categoryId = request.nextUrl.searchParams.get("categoryId")
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
  }

  const userId = session.user.id

  // Verify category belongs to the user
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  try {
    const videos = await cached(
      CACHE_KEYS.feed(categoryId),
      CACHE_TTL.feed,
      async () => {
        const accessToken = await getAccessToken(userId)

        const channels = await db
          .select()
          .from(categoryChannels)
          .where(eq(categoryChannels.categoryId, categoryId))

        const allVideos: Video[] = []

        await Promise.allSettled(
          channels.map(async (ch) => {
            const uploadsId = await cached(
              CACHE_KEYS.uploadsPlaylist(ch.channelId),
              CACHE_TTL.uploadsPlaylist,
              () => fetchUploadsPlaylistId(accessToken, ch.channelId)
            )
            const videos = await fetchRecentVideos(
              accessToken,
              uploadsId,
              CANDIDATES_PER_CHANNEL,
              {
                excludeShorts: true,
              }
            )
            allVideos.push(...videos)
          })
        )

        allVideos.sort(compareByUploadTime)
        return allVideos.slice(0, MAX_FEED_VIDEOS)
      }
    )

    const videoIds = videos.map((v) => v.videoId)
    const watched = videoIds.length
      ? await db
          .select({ videoId: watchedVideos.videoId })
          .from(watchedVideos)
          .where(
            and(
              eq(watchedVideos.userId, userId),
              inArray(watchedVideos.videoId, videoIds)
            )
          )
      : []

    return NextResponse.json({ videos, watchedVideoIds: watched.map((w) => w.videoId) })
  } catch (err) {
    console.error("feed route error:", err)
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    )
  }
}
