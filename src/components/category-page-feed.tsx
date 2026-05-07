"use client"

import { useState } from "react"
import { CategoryFeed } from "@/components/category-feed"
import { AddChannelsDialog } from "@/components/add-channels-dialog"

export function CategoryPageFeed({
  categoryId,
  initialAssignedIds,
}: {
  categoryId: string
  initialAssignedIds: string[]
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <AddChannelsDialog
        categoryId={categoryId}
        initialAssignedIds={initialAssignedIds}
        onChannelChange={() => setRefreshKey((k) => k + 1)}
      />
      <CategoryFeed categoryId={categoryId} refreshKey={refreshKey} />
    </>
  )
}
