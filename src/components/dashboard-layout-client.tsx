"use client"

import { useCallback, useState, type ReactNode, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core"
import { assignChannel } from "@/actions/channels"
import { MobileNav } from "@/components/mobile-nav"
import { Sidebar, type SidebarCategory } from "@/components/sidebar"
import { toast } from "sonner"
import type { Subscription } from "@/lib/youtube"

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
}

export function DashboardLayoutClient({
  categories,
  header,
  children,
}: {
  categories: SidebarCategory[]
  header: ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const [dragging, setDragging] = useState<Subscription | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const payload = e.active.data.current as
      | { type?: string; subscription?: Subscription }
      | undefined
    if (payload?.type === "subscription" && payload.subscription) {
      setDragging(payload.subscription)
    }
  }, [])

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setDragging(null)
      const activeData = e.active.data.current as
        | { type?: string; subscription?: Subscription }
        | undefined
      const subscription =
        activeData?.type === "subscription" ? activeData.subscription : undefined

      const overData = e.over?.data.current as
        | { type?: string; categoryId?: string; categoryName?: string }
        | undefined

      if (!subscription || overData?.type !== "category" || !overData.categoryId) return

      const meta = {
        channelId: subscription.channelId,
        channelName: subscription.channelName,
        channelThumbnail: subscription.channelThumbnail,
        subscriberCount: subscription.subscriberCount,
      }

      try {
        const result = await assignChannel(overData.categoryId, meta)
        if (result.success) {
          toast.success(
            overData.categoryName
              ? `${subscription.channelName} → ${overData.categoryName}`
              : "Added to category"
          )
          router.refresh()
        }
      } catch {
        toast.error("Could not add channel to category")
      }
    },
    [router]
  )

  const handleDragCancel = useCallback(() => {
    setDragging(null)
  }, [])

  const collisionDetection = useMemo(() => pointerWithin, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-screen">
        <Sidebar categories={categories} />
        <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-y-auto">
          {header}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
      </div>
      <MobileNav />
      <DragOverlay dropAnimation={dropAnimation}>
        {dragging ? (
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg w-[min(100vw-2rem,20rem)]">
            {dragging.channelThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dragging.channelThumbnail}
                alt=""
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
            )}
            <p className="text-sm font-medium truncate">{dragging.channelName}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
