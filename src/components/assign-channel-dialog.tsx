"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { assignChannel, removeChannel } from "@/actions/channels"
import { createCategoryQuick } from "@/actions/categories"
import { Plus, Check, Loader2 } from "lucide-react"
import type { Category } from "@/db/schema"
import type { Subscription } from "@/lib/youtube"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function AssignChannelDialog({
  subscription,
  categories,
  assignedCategoryIds,
  triggerVariant = "default",
}: {
  subscription: Subscription
  categories: Category[]
  assignedCategoryIds: string[]
  /** Icon-only trigger for dense layouts (e.g. subscription grid). */
  triggerVariant?: "default" | "compact"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [assigned, setAssigned] = useState(new Set(assignedCategoryIds))
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [categorySearch, setCategorySearch] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setNewCategoryName("")
      setCreateError(null)
      setCategorySearch("")
    }
  }

  async function toggle(categoryId: string) {
    if (pendingCategoryId) return
    setPendingCategoryId(categoryId)
    try {
      if (assigned.has(categoryId)) {
        const result = await removeChannel(subscription.channelId, categoryId)
        if (result.success) {
          setAssigned((prev) => {
            const nextSet = new Set(prev)
            nextSet.delete(categoryId)
            return nextSet
          })
          toast.success("Removed from category")
        }
      } else {
        const result = await assignChannel(categoryId, {
          channelId: subscription.channelId,
          channelName: subscription.channelName,
          channelThumbnail: subscription.channelThumbnail,
          subscriberCount: subscription.subscriberCount,
        })
        if (result.success) {
          setAssigned((prev) => new Set([...prev, categoryId]))
          toast.success("Added to category")
        }
      }
    } finally {
      setPendingCategoryId(null)
    }
  }

  async function createAndAdd() {
    const name = newCategoryName.trim()
    if (!name) return
    setCreateError(null)
    setCreating(true)
    try {
      const created = await createCategoryQuick({ name })
      if (!created.success) {
        setCreateError(created.error)
        return
      }
      const add = await assignChannel(created.category.id, {
        channelId: subscription.channelId,
        channelName: subscription.channelName,
        channelThumbnail: subscription.channelThumbnail,
        subscriberCount: subscription.subscriberCount,
      })
      if (!add.success) {
        toast.error("Category created but could not add this channel. Try again from the list.")
        router.refresh()
        return
      }
      setAssigned((prev) => new Set([...prev, created.category.id]))
      setNewCategoryName("")
      toast.success(`Created "${created.category.name}" and added this channel`)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size={triggerVariant === "compact" ? "icon-sm" : "sm"}
            className={cn(triggerVariant === "compact" ? "size-9 shrink-0" : "gap-1.5")}
          />
        }
      >
        <Plus className={triggerVariant === "compact" ? "size-4" : "size-3.5"} />
        {triggerVariant === "compact" ? (
          <span className="sr-only">Organize</span>
        ) : (
          "Organize"
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{subscription.channelName}</DialogTitle>
        </DialogHeader>

        {categories.length > 0 ? (
          <div className="space-y-2">
            <Input
              placeholder="Search categories…"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
            />
            <ul className="space-y-1.5 max-h-[min(40vh,16rem)] overflow-y-auto py-1 -mx-1 px-1">
              {categories
                .filter((cat) =>
                  cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                )
                .map((cat) => {
                  const isAssigned = assigned.has(cat.id)
                  const isPending = pendingCategoryId === cat.id
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => toggle(cat.id)}
                        disabled={!!pendingCategoryId}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <span className="text-base leading-none shrink-0">{cat.emoji ?? "📁"}</span>
                        <span className="flex-1 text-left">{cat.name}</span>
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isAssigned ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                        {isAssigned && !isPending && (
                          <Badge variant="secondary" className="text-xs">added</Badge>
                        )}
                      </button>
                    </li>
                  )
                })}
              {categorySearch &&
                !categories.some((cat) =>
                  cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                ) && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No categories match &ldquo;{categorySearch}&rdquo;
                  </li>
                )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-1">
            No categories yet. Create one below — this channel will be added automatically.
          </p>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            New category
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              maxLength={50}
              disabled={creating}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  createAndAdd()
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              disabled={creating || !newCategoryName.trim()}
              onClick={createAndAdd}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create & add"
              )}
            </Button>
          </div>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
