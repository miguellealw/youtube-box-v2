import { auth } from "@/auth"
import { db } from "@/db"
import { categories, categoryChannels } from "@/db/schema"
import { eq } from "drizzle-orm"
import { SubscriptionList } from "@/components/subscription-list"

export default async function SubscriptionsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [userCategories, assignments] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name),
    db
      .select({ channelId: categoryChannels.channelId, categoryId: categoryChannels.categoryId })
      .from(categoryChannels)
      .where(eq(categoryChannels.userId, userId)),
  ])

  // channelId → list of categoryIds the channel is in
  const assignedMap = assignments.reduce<Record<string, string[]>>((acc, r) => {
    ;(acc[r.channelId] ??= []).push(r.categoryId)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse your YouTube subscriptions and add them to categories.
        </p>
      </div>
      <SubscriptionList categories={userCategories} assignedMap={assignedMap} />
    </div>
  )
}
