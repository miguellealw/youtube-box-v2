import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { CategoryPageFeed } from "@/components/category-page-feed"
import { CategoryBackButton } from "@/components/category-back-button"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"

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
    <div>
      <div className="sticky top-12 md:top-0 z-20 -mx-4 px-4 md:-mx-7 md:px-7 py-2 bg-background/95 backdrop-blur-md border-b border-border/80">
        <CategoryBackButton />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none shrink-0">{category.emoji ?? "📁"}</span>
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

      <div className="mt-6">
        <CategoryPageFeed
          categoryId={categoryId}
          initialAssignedIds={channels.map((ch) => ch.channelId)}
          channels={channels}
        />
      </div>
    </div>
  )
}
