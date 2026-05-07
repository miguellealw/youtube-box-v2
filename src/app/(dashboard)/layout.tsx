import Link from "next/link"
import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardLayoutClient } from "@/components/dashboard-layout-client"
import { Button } from "@/components/ui/button"
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
      color: categories.color,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.name)

  const header = (
    <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b">
      <Link href="/dashboard" className="font-bold text-base tracking-tight md:hidden mr-auto">
        YouTube Box
      </Link>
      <span className="text-sm text-muted-foreground hidden sm:block ml-auto truncate max-w-[180px]">
        {session.user?.name ?? session.user?.email}
      </span>
      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/" })
        }}
      >
        <Button variant="outline" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </header>
  )

  return (
    <DashboardLayoutClient categories={categoryRows} header={header}>
      {children}
    </DashboardLayoutClient>
  )
}
