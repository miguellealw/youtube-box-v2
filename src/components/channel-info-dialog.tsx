"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { removeChannel } from "@/actions/channels"
import { ExternalLink, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/db/schema"
import type { Subscription } from "@/lib/youtube"

export function ChannelInfoDialog({
  subscription,
  categories,
  assignedCategoryIds,
  children,
}: {
  subscription: Subscription
  categories: Category[]
  assignedCategoryIds: string[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [assigned, setAssigned] = useState(new Set(assignedCategoryIds))
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setAssigned(new Set(assignedCategoryIds))
    }
  }

  async function handleRemove(categoryId: string) {
    if (pendingCategoryId) return
    setPendingCategoryId(categoryId)
    try {
      const result = await removeChannel(subscription.channelId, categoryId)
      if (result.success) {
        setAssigned((prev) => {
          const next = new Set(prev)
          next.delete(categoryId)
          return next
        })
        toast.success("Removed from category")
      }
    } catch {
      toast.error("Failed to remove. Please try again.")
    } finally {
      setPendingCategoryId(null)
    }
  }

  const assignedCategories = categories.filter((cat) => assigned.has(cat.id))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="contents"
      >
        {children}
      </button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {subscription.channelThumbnail ? (
              <Image
                src={subscription.channelThumbnail}
                alt={subscription.channelName}
                width={48}
                height={48}
                className="size-12 rounded-full shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
            )}
            <DialogTitle className="text-base">
              {subscription.channelName}
            </DialogTitle>
          </div>
        </DialogHeader>

        <a
          href={`https://www.youtube.com/channel/${subscription.channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="size-4" />
          View on YouTube
        </a>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Categories
          </p>
          {assignedCategories.length > 0 ? (
            <ul className="space-y-1">
              {assignedCategories.map((cat) => {
                const isPending = pendingCategoryId === cat.id
                return (
                  <li
                    key={cat.id}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-muted/50"
                  >
                    <span className="text-base leading-none shrink-0">
                      {cat.emoji ?? "📁"}
                    </span>
                    <span className="flex-1">{cat.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!!pendingCategoryId}
                      onClick={() => handleRemove(cat.id)}
                      aria-label={`Remove from ${cat.name}`}
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not added to any categories yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
