"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LayoutDashboard, LogOut, Plus, Settings2, Tv, Search } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { signOutAction } from "@/actions/auth"

export type SidebarCategory = {
  id: string
  name: string
  emoji: string | null
}

export type SidebarUser = {
  name?: string | null
  email?: string | null
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
        "rounded-lg transition-colors",
        isOver && "bg-primary/12 ring-2 ring-primary/40 ring-inset"
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border/80"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        <span className="text-sm leading-none shrink-0">{category.emoji ?? "📁"}</span>
        <span className="truncate">{category.name}</span>
      </Link>
    </div>
  )
}

export function Sidebar({ categories, user }: { categories: SidebarCategory[]; user: SidebarUser }) {
  const pathname = usePathname()
  const [search, setSearch] = useState("")
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col min-h-0 self-stretch overflow-hidden border-r border-border/80 bg-sidebar text-sidebar-foreground shadow-[1px_0_0_0_oklch(0_0_0/0.04)] dark:shadow-[1px_0_0_0_oklch(1_0_0/0.06)]">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="font-semibold text-lg tracking-tight">
          YouTube Box
        </Link>
      </div>

      <nav className="px-2 py-3 space-y-0.5 border-b border-sidebar-border">
        {primaryNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/80"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 opacity-90" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pt-4 pb-2 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Your categories
        </p>
        {categories.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
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
          ) : filteredCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">No results.</p>
          ) : (
            filteredCategories.map((c) => <CategoryNavRow key={c.id} category={c} />)
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5">
        <Link
          href="/categories"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/categories"
              ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border/80"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          )}
        >
          <Settings2 className="h-4 w-4 opacity-90" />
          Manage categories
        </Link>
        <Link
          href="/categories/new"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/categories/new"
              ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border/80"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          )}
        >
          <Plus className="h-4 w-4 opacity-90" />
          New category
        </Link>
        <div className="flex items-center px-3 pt-1">
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-sidebar-border px-2 py-3">
        <div className="px-3 pb-1.5">
          <p className="text-xs text-muted-foreground truncate">{user.name ?? user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground w-full text-left"
          >
            <LogOut className="h-4 w-4 opacity-90" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
