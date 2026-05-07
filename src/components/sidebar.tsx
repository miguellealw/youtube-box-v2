"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Plus, Settings2, Tv, ListMusic } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { ScrollArea } from "@/components/ui/scroll-area"

export type SidebarCategory = {
  id: string
  name: string
  color: string | null
}

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: Tv },
] as const

function CategoryNavRow({ category }: { category: SidebarCategory }) {
  const pathname = usePathname()
  const href = `/categories/${category.id}`
  const active = pathname === href || pathname.startsWith(`${href}/`)

  const { setNodeRef, isOver } = useDroppable({
    id: `category-drop-${category.id}`,
    data: {
      type: "category",
      categoryId: category.id,
      categoryName: category.name,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md transition-colors",
        isOver && "bg-primary/15 ring-2 ring-primary ring-inset"
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        {category.color ? (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-border"
            style={{ backgroundColor: category.color }}
          />
        ) : (
          <ListMusic className="h-4 w-4 shrink-0 opacity-70" />
        )}
        <span className="truncate">{category.name}</span>
      </Link>
    </div>
  )
}

export function Sidebar({ categories }: { categories: SidebarCategory[] }) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 lg:w-64 shrink-0 border-r bg-muted/30 sticky top-0 flex-col min-h-0 self-stretch overflow-hidden">
      <div className="px-4 py-5 border-b">
        <Link href="/dashboard" className="font-bold text-lg tracking-tight">
          YouTube Box
        </Link>
      </div>

      <nav className="px-2 py-3 space-y-1 border-b">
        {primaryNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 pt-4 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your categories
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-2">
        <div className="space-y-0.5 pb-2 pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2 leading-relaxed">
              No categories yet.{" "}
              <Link href="/categories/new" className="underline hover:text-foreground">
                Create one
              </Link>
            </p>
          ) : (
            categories.map((c) => <CategoryNavRow key={c.id} category={c} />)
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-2 py-3 space-y-1">
        <Link
          href="/categories"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/categories"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings2 className="h-4 w-4" />
          Manage categories
        </Link>
        <Link
          href="/categories/new"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/categories/new"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Plus className="h-4 w-4" />
          New category
        </Link>
        <div className="flex items-center px-3 pt-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
