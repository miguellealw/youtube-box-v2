"use client"

import { useState, useTransition } from "react"
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

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
]

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
  const [pending, startTransition] = useTransition()
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState<string | undefined>(undefined)
  const [createError, setCreateError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setNewCategoryName("")
      setNewCategoryColor(undefined)
      setCreateError(null)
    }
  }

  function toggle(categoryId: string) {
    startTransition(async () => {
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
    })
  }

  function createAndAdd() {
    const name = newCategoryName.trim()
    if (!name) return
    setCreateError(null)
    startTransition(async () => {
      try {
        const created = await createCategoryQuick({
          name,
          color: newCategoryColor,
        })
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
        setNewCategoryColor(undefined)
        toast.success(`Created "${created.category.name}" and added this channel`)
        router.refresh()
      } catch {
        toast.error("Something went wrong. Please try again.")
      }
    })
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
          <ul className="space-y-1.5 max-h-[min(40vh,16rem)] overflow-y-auto py-1 -mx-1 px-1">
            {categories.map((cat) => {
              const isAssigned = assigned.has(cat.id)
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    disabled={pending}
                    className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {cat.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    <span className="flex-1 text-left">{cat.name}</span>
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isAssigned ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                    {isAssigned && (
                      <Badge variant="secondary" className="text-xs">added</Badge>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
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
              disabled={pending}
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
              disabled={pending || !newCategoryName.trim()}
              onClick={createAndAdd}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create & add"
              )}
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Color (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setNewCategoryColor(undefined)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] text-muted-foreground transition-colors hover:bg-muted",
                  newCategoryColor === undefined && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
                title="No color"
              >
                —
              </button>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={pending}
                  onClick={() => setNewCategoryColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-105",
                    newCategoryColor === c ? "ring-foreground" : "ring-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
