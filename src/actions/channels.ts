"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { invalidate, CACHE_KEYS } from "@/lib/cache"

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

async function verifyCategory(categoryId: string, userId: string) {
  const [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)
  if (!cat) throw new Error("Category not found")
  return cat
}

export async function assignChannel(
  categoryId: string,
  channelMeta: {
    channelId: string
    channelName: string
    channelThumbnail: string
    subscriberCount: string
  }
) {
  const userId = await requireAuth()
  await verifyCategory(categoryId, userId)

  await db
    .insert(categoryChannels)
    .values({
      categoryId,
      userId,
      channelId: channelMeta.channelId,
      channelName: channelMeta.channelName,
      channelThumbnail: channelMeta.channelThumbnail,
      subscriberCount: channelMeta.subscriberCount,
    })
    .onConflictDoNothing()

  await invalidate(CACHE_KEYS.feed(categoryId))
  revalidatePath("/categories")
  revalidatePath("/dashboard")

  return { success: true }
}

export async function removeChannel(channelId: string, categoryId: string) {
  const userId = await requireAuth()
  await verifyCategory(categoryId, userId)

  await db
    .delete(categoryChannels)
    .where(
      and(
        eq(categoryChannels.channelId, channelId),
        eq(categoryChannels.categoryId, categoryId)
      )
    )

  await invalidate(CACHE_KEYS.feed(categoryId))
  revalidatePath("/categories")
  revalidatePath("/dashboard")

  return { success: true }
}
