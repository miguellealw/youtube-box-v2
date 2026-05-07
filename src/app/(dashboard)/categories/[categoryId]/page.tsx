import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { CategoryPageFeed } from "@/components/category-page-feed"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, ChevronLeft } from "lucide-react"

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const session = await auth()
  const userId = session!.user!.id!

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)

  if (!category) notFound()

  const channels = await db
    .select()
    .from(categoryChannels)
    .where(eq(categoryChannels.categoryId, categoryId))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/categories"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            All categories
          </Link>
          <div className="flex items-center gap-3">
            {category.color && (
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
            <h1 className="text-2xl font-bold">{category.name}</h1>
            <Badge variant="secondary">{channels.length} channels</Badge>
          </div>
          {category.description && (
            <p className="text-muted-foreground text-sm mt-1">{category.description}</p>
          )}
        </div>
        <Link
          href={`/categories/${categoryId}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </div>

      <CategoryPageFeed
        categoryId={categoryId}
        initialAssignedIds={channels.map((ch) => ch.channelId)}
        channels={channels}
      />
    </div>
  )
}
