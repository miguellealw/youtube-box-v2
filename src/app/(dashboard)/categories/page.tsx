import Link from "next/link"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq } from "drizzle-orm"
import { buttonVariants } from "@/components/ui/button"
import { CategoriesList } from "@/components/categories-list"
import { Plus } from "lucide-react"

export default async function CategoriesPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const rows = await db
    .select({ category: categories })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.createdAt)

  const channelCounts = await db
    .select({ categoryId: categoryChannels.categoryId })
    .from(categoryChannels)
    .where(eq(categoryChannels.userId, userId))

  const countMap = channelCounts.reduce<Record<string, number>>((acc, r) => {
    acc[r.categoryId] = (acc[r.categoryId] ?? 0) + 1
    return acc
  }, {})

  const items = rows.map(({ category }) => ({
    id: category.id,
    name: category.name,
    emoji: category.emoji,
    description: category.description,
    channelCount: countMap[category.id] ?? 0,
  }))

  return (
    <div className="space-y-6 max-w-3xl w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize your subscriptions into custom categories.
          </p>
        </div>
        <Link href="/categories/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New Category
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="mb-3">No categories yet.</p>
          <Link href="/categories/new" className={buttonVariants({ variant: "outline" })}>
            Create your first category
          </Link>
        </div>
      ) : (
        <CategoriesList items={items} />
      )}
    </div>
  )
}
