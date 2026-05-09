"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteCategory } from "@/actions/categories"

export type CategoryListItem = {
  id: string
  name: string
  emoji: string | null
  description: string | null
  channelCount: number
}

export function CategoriesList({ items }: { items: CategoryListItem[] }) {
  const [search, setSearch] = useState("")

  const filtered = search
    ? items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="space-y-4">
      <div className="relative md:hidden">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No categories match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((category) => {
            const deleteAction = deleteCategory.bind(null, category.id)
            return (
              <li
                key={category.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <span className="text-lg leading-none shrink-0">
                  {category.emoji ?? "📁"}
                </span>
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
                <Badge variant="secondary">{category.channelCount} channels</Badge>
                <Link
                  href={`/categories/${category.id}/edit`}
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Link>
                <form action={deleteAction}>
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
            )
          })}
        </ul>
      )}
    </div>
  )
}
