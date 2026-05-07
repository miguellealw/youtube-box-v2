"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories } from "@/db/schema"
import { eq, and } from "drizzle-orm"

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  description: z.string().max(200, "Description is too long").optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
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
    color: formData.get("color") || undefined,
  })

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    await db.insert(categories).values({
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? null,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false as const, error: "A category with that name already exists" }
    }
    return { success: false as const, error: "Failed to create category" }
  }

  revalidatePath("/categories")
  revalidatePath("/dashboard")
  redirect("/categories")
}

export async function updateCategory(categoryId: string, _prevState: unknown, formData: FormData) {
  const userId = await requireAuth()

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
  })

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  await db
    .update(categories)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? null,
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
