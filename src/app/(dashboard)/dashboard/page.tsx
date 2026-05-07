import Link from "next/link"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq } from "drizzle-orm"
import { CategoryCard } from "@/components/category-card"
import { buttonVariants } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [userCategories, allChannels] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name),
    db.select().from(categoryChannels).where(eq(categoryChannels.userId, userId)),
  ])

  const channelsByCategory = allChannels.reduce<Record<string, typeof allChannels>>(
    (acc, ch) => {
      ;(acc[ch.categoryId] ??= []).push(ch)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your subscription categories at a glance.
          </p>
        </div>
        <Link href="/categories/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New Category
        </Link>
      </div>

      {userCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground space-y-3">
          <p className="text-base">No categories yet.</p>
          <p className="text-sm">
            Create a category, then add channels from your{" "}
            <Link href="/subscriptions" className="underline hover:text-foreground">
              subscriptions
            </Link>
            .
          </p>
          <Link href="/categories/new" className={buttonVariants({ variant: "outline" })}>
            Create category
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {userCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              channels={channelsByCategory[cat.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
