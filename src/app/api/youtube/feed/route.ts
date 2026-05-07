import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getAccessToken } from "@/lib/tokens"
import { fetchUploadsPlaylistId, fetchRecentVideos } from "@/lib/youtube"
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"
import type { Video } from "@/lib/youtube"

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
            const videos = await fetchRecentVideos(accessToken, uploadsId, 5, {
              excludeShorts: true,
            })
            allVideos.push(...videos)
          })
        )

        return allVideos.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
      }
    )

    return NextResponse.json(videos)
  } catch (err) {
    console.error("feed route error:", err)
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    )
  }
}
