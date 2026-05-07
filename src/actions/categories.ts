"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, type Category } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getEmojiForCategory } from "@/lib/emoji"

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  description: z.string().max(200, "Description is too long").optional(),
  emoji: z.string().max(10).optional(),
})

const quickCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  emoji: z.string().max(10).optional(),
})

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function createCategory(_prevState: unknown, formData: FormData) {
  const userId = await requireAuth()

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    emoji: formData.get("emoji") || undefined,
  })

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await db.insert(categories).values({
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      emoji: parsed.data.emoji ?? getEmojiForCategory(parsed.data.name),
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false as const, error: "A category with that name already exists" }
    }
    return { success: false as const, error: "Failed to create category" }
  }

  revalidatePath("/categories")
  revalidatePath("/dashboard")
  revalidatePath("/subscriptions")
  redirect("/categories")
}

export async function createCategoryQuick(input: {
  name: string
  emoji?: string
}): Promise<{ success: true; category: Category } | { success: false; error: string }> {
  const userId = await requireAuth()

  const parsed = quickCreateSchema.safeParse({
    name: input.name.trim(),
    emoji: input.emoji?.trim() || undefined,
  })

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    const [category] = await db
      .insert(categories)
      .values({
        userId,
        name: parsed.data.name,
        description: null,
        emoji: parsed.data.emoji ?? getEmojiForCategory(parsed.data.name),
      })
      .returning()

    revalidatePath("/categories")
    revalidatePath("/dashboard")
    revalidatePath("/subscriptions")

    return { success: true as const, category }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false as const, error: "A category with that name already exists" }
    }
    return { success: false as const, error: "Failed to create category" }
  }
}

export async function updateCategory(categoryId: string, _prevState: unknown, formData: FormData) {
  const userId = await requireAuth()

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    emoji: formData.get("emoji") || undefined,
  })

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  await db
    .update(categories)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      emoji: parsed.data.emoji ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))

  revalidatePath("/categories")
  revalidatePath("/dashboard")
  redirect("/categories")
}

export async function deleteCategory(categoryId: string) {
  const userId = await requireAuth()

  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))

  revalidatePath("/categories")
  revalidatePath("/dashboard")
}
