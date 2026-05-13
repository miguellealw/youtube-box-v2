import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Category, CategoryChannel } from "@/db/schema"

export function CategoryCard({
  category,
  channels,
}: {
  category: Category
  channels: CategoryChannel[]
}) {
  const preview = channels.slice(0, 4)

  return (
    <Link href={`/categories/${category.id}`}>
      <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:border-border hover:ring-1 hover:ring-primary/8">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none shrink-0">{category.emoji ?? "📁"}</span>
            <CardTitle className="text-base">{category.name}</CardTitle>
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {category.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary" className="text-xs">
            {channels.length} channel{channels.length !== 1 ? "s" : ""}
          </Badge>
          {preview.length > 0 && (
            <div className="flex -space-x-2">
              {preview.map((ch) =>
                ch.channelThumbnail ? (
                  <Image
                    key={ch.channelId}
                    src={ch.channelThumbnail}
                    alt={ch.channelName}
                    width={28}
                    height={28}
                    className="rounded-full ring-2 ring-background"
                  />
                ) : (
                  <div
                    key={ch.channelId}
                    className="h-7 w-7 rounded-full bg-muted ring-2 ring-background"
                  />
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
