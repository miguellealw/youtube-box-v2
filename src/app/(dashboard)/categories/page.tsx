import Link from "next/link"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { deleteCategory } from "@/actions/categories"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
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

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="mb-3">No categories yet.</p>
          <Link href="/categories/new" className={buttonVariants({ variant: "outline" })}>
            Create your first category
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ category }) => (
            <li
              key={category.id}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              {category.color && (
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/categories/${category.id}`}
                  className="font-medium hover:underline"
                >
                  {category.name}
                </Link>
                {category.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {category.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary">
                {countMap[category.id] ?? 0} channels
              </Badge>
              <Link
                href={`/categories/${category.id}/edit`}
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Link>
              <form
                action={async () => {
                  "use server"
                  await deleteCategory(category.id)
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                  className={cn("text-destructive hover:text-destructive")}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
