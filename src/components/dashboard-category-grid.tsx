"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { CategoryCard } from "@/components/category-card"
import type { Category, CategoryChannel } from "@/db/schema"

type Item = {
  category: Category
  channels: CategoryChannel[]
}

export function DashboardCategoryGrid({ items }: { items: Item[] }) {
  const [search, setSearch] = useState("")

  const filtered = search
    ? items.filter((item) =>
        item.category.name.toLowerCase().includes(search.toLowerCase())
      )
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {filtered.map(({ category, channels }) => (
            <CategoryCard key={category.id} category={category} channels={channels} />
          ))}
        </div>
      )}
    </div>
  )
}
