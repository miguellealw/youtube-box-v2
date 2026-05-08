import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardLayoutClient } from "@/components/dashboard-layout-client"
import { db } from "@/db"
import { categories } from "@/db/schema"
import { eq } from "drizzle-orm"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/")
  const userId = session.user!.id!

  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.name)

  const header = (
    <header className="sticky top-0 z-10 flex shrink-0 items-center border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden supports-[backdrop-filter]:bg-background/70">
      <Link href="/dashboard" className="font-semibold text-base tracking-tight">
        YouTube Box
      </Link>
    </header>
  )

  return (
    <DashboardLayoutClient
      categories={categoryRows}
      user={{ name: session.user?.name, email: session.user?.email }}
      header={header}
    >
      {children}
    </DashboardLayoutClient>
  )
}
