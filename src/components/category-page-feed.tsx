"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CategoryFeed } from "@/components/category-feed"
import { AddChannelsDialog } from "@/components/add-channels-dialog"
import { cn } from "@/lib/utils"
import type { CategoryChannel } from "@/db/schema"

export function CategoryPageFeed({
  categoryId,
  initialAssignedIds,
  channels,
}: {
  categoryId: string
  initialAssignedIds: string[]
  channels: CategoryChannel[]
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  /** `null` = show all channels; otherwise only these channel IDs */
  const [activeChannelIds, setActiveChannelIds] = useState<string[] | null>(null)

  useEffect(() => {
    setActiveChannelIds(null)
  }, [refreshKey])

  const toggleChannelFilter = (channelId: string) => {
    setActiveChannelIds((prev) => {
      if (prev === null) return [channelId]
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
      return next.length === 0 ? null : next
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {channels.map((ch) => {
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
        <AddChannelsDialog
          categoryId={categoryId}
          initialAssignedIds={initialAssignedIds}
          onChannelChange={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <CategoryFeed
        categoryId={categoryId}
        refreshKey={refreshKey}
        activeChannelIds={activeChannelIds}
      />
    </>
  )
}
