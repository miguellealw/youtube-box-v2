import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { CategoryFeed } from "@/components/category-feed"
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
      <div className="flex items-start justify-between gap-4">
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

      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {channels.map((ch) => (
            <div
              key={ch.channelId}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              {ch.channelThumbnail && (
                <Image
                  src={ch.channelThumbnail}
                  alt={ch.channelName}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              )}
              {ch.channelName}
            </div>
          ))}
        </div>
      )}

      <CategoryFeed categoryId={categoryId} />
    </div>
  )
}
