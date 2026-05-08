"use server"

import { auth } from "@/auth"
import { db } from "@/db"
import { watchedVideos } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export async function toggleWatched(videoId: string, currentlyWatched: boolean) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  if (currentlyWatched) {
    await db
      .delete(watchedVideos)
      .where(and(eq(watchedVideos.userId, userId), eq(watchedVideos.videoId, videoId)))
  } else {
    await db.insert(watchedVideos).values({ userId, videoId }).onConflictDoNothing()
  }
}
