"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { assignChannel, removeChannel } from "@/actions/channels"
import { Plus, Check, Loader2 } from "lucide-react"
import type { Category } from "@/db/schema"
import type { Subscription } from "@/lib/youtube"
import { toast } from "sonner"

export function AssignChannelDialog({
  subscription,
  categories,
  assignedCategoryIds,
}: {
  subscription: Subscription
  categories: Category[]
  assignedCategoryIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [assigned, setAssigned] = useState(new Set(assignedCategoryIds))
  const [pending, startTransition] = useTransition()

  function toggle(categoryId: string) {
    startTransition(async () => {
      if (assigned.has(categoryId)) {
        const result = await removeChannel(subscription.channelId, categoryId)
        if (result.success) {
          setAssigned((prev) => {
            const next = new Set(prev)
            next.delete(categoryId)
            return next
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Organize
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{subscription.channelName}</DialogTitle>
        </DialogHeader>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No categories yet. Create one first.
          </p>
        ) : (
          <ul className="space-y-1.5 py-2">
            {categories.map((cat) => {
              const isAssigned = assigned.has(cat.id)
              return (
                <li key={cat.id}>
                  <button
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
        )}
      </DialogContent>
    </Dialog>
  )
}
