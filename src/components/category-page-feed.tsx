"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CategoryFeed } from "@/components/category-feed"
import { AddChannelsDialog } from "@/components/add-channels-dialog"
import { cn } from "@/lib/utils"
import type { CategoryChannel } from "@/db/schema"
import { X, Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { removeChannel } from "@/actions/channels"

export function CategoryPageFeed({
  categoryId,
  initialAssignedIds,
  channels: initialChannels,
}: {
  categoryId: string
  initialAssignedIds: string[]
  channels: CategoryChannel[]
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeChannelIds, setActiveChannelIds] = useState<string[] | null>(null)
  const [localChannels, setLocalChannels] = useState<CategoryChannel[]>(initialChannels)
  const [isEditMode, setIsEditMode] = useState(false)
  const [removingChannelId, setRemovingChannelId] = useState<string | null>(null)

  useEffect(() => {
    setActiveChannelIds(null)
    setIsEditMode(false)
  }, [refreshKey])

  useEffect(() => {
    setLocalChannels(initialChannels)
  }, [initialChannels])

  const toggleChannelFilter = (channelId: string) => {
    setActiveChannelIds((prev) => {
      if (prev === null) return [channelId]
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
      return next.length === 0 ? null : next
    })
  }

  async function handleRemove(ch: CategoryChannel) {
    if (removingChannelId) return
    setRemovingChannelId(ch.channelId)
    try {
      const result = await removeChannel(ch.channelId, categoryId)
      if (result.success) {
        setLocalChannels((prev) => prev.filter((c) => c.channelId !== ch.channelId))
        setActiveChannelIds((prev) => {
          if (prev === null) return null
          const next = prev.filter((id) => id !== ch.channelId)
          return next.length === 0 ? null : next
        })
        toast.success(`Removed ${ch.channelName}`)
        setRefreshKey((k) => k + 1)
      } else {
        toast.error(`Could not remove ${ch.channelName}`)
      }
    } catch {
      toast.error(`Could not remove ${ch.channelName}`)
    } finally {
      setRemovingChannelId(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {localChannels.map((ch) => {
          const isRemoving = removingChannelId === ch.channelId

          if (isEditMode) {
            return (
              <span
                key={ch.channelId}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
              >
                {ch.channelThumbnail && (
                  <Image
                    src={ch.channelThumbnail}
                    alt=""
                    width={16}
                    height={16}
                    sizes="16px"
                    className="size-4 rounded-full"
                  />
                )}
                {ch.channelName}
                <button
                  type="button"
                  aria-label={`Remove ${ch.channelName}`}
                  disabled={!!removingChannelId}
                  onClick={() => handleRemove(ch)}
                  className={cn(
                    "ml-0.5 rounded-full p-0.5 transition-colors",
                    "hover:bg-destructive/15 hover:text-destructive",
                    "disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  {isRemoving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </span>
            )
          }

          const isFiltering = activeChannelIds !== null
          const isSelected =
            !isFiltering || (activeChannelIds?.includes(ch.channelId) ?? false)
          return (
            <button
              key={ch.channelId}
              type="button"
              onClick={() => toggleChannelFilter(ch.channelId)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                isFiltering && !isSelected && "opacity-45",
                isFiltering &&
                  isSelected &&
                  "border-primary bg-primary/10 ring-1 ring-primary/25"
              )}
            >
              {ch.channelThumbnail && (
                <Image
                  src={ch.channelThumbnail}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              )}
              {ch.channelName}
            </button>
          )
        })}

        {localChannels.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsEditMode((v) => {
                if (!v) setActiveChannelIds(null)
                return !v
              })
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isEditMode
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                : "border-dashed text-muted-foreground hover:border-foreground/50 hover:text-foreground"
            )}
          >
            {isEditMode ? (
              <>
                <X className="h-3.5 w-3.5" />
                Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </>
            )}
          </button>
        )}

        {!isEditMode && (
          <AddChannelsDialog
            categoryId={categoryId}
            initialAssignedIds={initialAssignedIds}
            onChannelChange={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </div>
      <CategoryFeed
        categoryId={categoryId}
        refreshKey={refreshKey}
        activeChannelIds={activeChannelIds}
      />
    </>
  )
}
