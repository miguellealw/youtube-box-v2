const YT_API = "https://www.googleapis.com/youtube/v3"

/** YouTube snippet.thumbnails keys; pick the largest URL that exists. */
type YTThumbnailSet = Partial<
  Record<"maxres" | "standard" | "high" | "medium" | "default", { url?: string; width?: number; height?: number }>
>

function pickBestThumbnailUrl(thumbnails?: YTThumbnailSet | null): string {
  if (!thumbnails) return ""
  const order = [
    "maxres",
    "standard",
    "high",
    "medium",
    "default",
  ] as const
  for (const key of order) {
    const url = thumbnails[key]?.url
    if (url) return url
  }
  return ""
}

export interface Subscription {
  channelId: string
  channelName: string
  channelThumbnail: string
  subscriberCount: string
  description: string
}

export interface Video {
  videoId: string
  title: string
  thumbnail: string
  channelId: string
  channelName: string
  publishedAt: string
  durationSeconds?: number
  isShort?: boolean
}

async function ytFetch<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<T> {
  const url = new URL(`${YT_API}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

interface YTSubscriptionItem {
  snippet: {
    resourceId: { channelId: string }
    title: string
    thumbnails: YTThumbnailSet
    description: string
  }
}

interface YTChannelItem {
  id: string
  snippet: { thumbnails: YTThumbnailSet }
  statistics: { subscriberCount?: string }
  contentDetails?: { relatedPlaylists: { uploads: string } }
}

interface YTPlaylistItem {
  snippet: {
    resourceId: { videoId: string }
    title: string
    thumbnails: YTThumbnailSet
    channelId: string
    channelTitle: string
    publishedAt: string
  }
}

export interface SubscriptionPage {
  items: Subscription[]
  nextPageToken: string | null
}

export async function fetchSubscriptionPage(
  accessToken: string,
  pageToken?: string
): Promise<SubscriptionPage> {
  const params: Record<string, string> = {
    part: "snippet",
    mine: "true",
    maxResults: "50",
  }
  if (pageToken) params.pageToken = pageToken

  const data = await ytFetch<{
    items: YTSubscriptionItem[]
    nextPageToken?: string
  }>("/subscriptions", params, accessToken)

  const subs: Subscription[] = (data.items ?? []).map((item) => ({
    channelId: item.snippet.resourceId.channelId,
    channelName: item.snippet.title,
    channelThumbnail: pickBestThumbnailUrl(item.snippet.thumbnails),
    subscriberCount: "",
    description: item.snippet.description,
  }))

  if (subs.length > 0) {
    // Enrich the page's channels with subscriber counts (all fit in one batch)
    const ids = subs.map((s) => s.channelId)
    const enrichData = await ytFetch<{ items: YTChannelItem[] }>(
      "/channels",
      { part: "snippet,statistics", id: ids.join(",") },
      accessToken
    )
    const countMap = new Map(
      (enrichData.items ?? []).map((c) => [
        c.id,
        {
          count: c.statistics.subscriberCount ?? "0",
          thumbnail: pickBestThumbnailUrl(c.snippet.thumbnails) || undefined,
        },
      ])
    )
    for (const sub of subs) {
      const info = countMap.get(sub.channelId)
      if (info) {
        sub.subscriberCount = info.count
        if (info.thumbnail) sub.channelThumbnail = info.thumbnail
      }
    }
  }

  return { items: subs, nextPageToken: data.nextPageToken ?? null }
}

/** Parses YouTube/API ISO 8601 duration (PT1H2M3S). */
function parseIso8601DurationSeconds(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso)
  if (!m) return 0
  const h = parseInt(m[1] ?? "0", 10)
  const minute = parseInt(m[2] ?? "0", 10)
  const s = parseInt(m[3] ?? "0", 10)
  return h * 3600 + minute * 60 + s
}

/**
 * Returns true when the best available thumbnail dimensions indicate portrait (width < height).
 * Returns null when no dimension data is available.
 */
function isPortraitThumbnail(thumbnails?: YTThumbnailSet | null): boolean | null {
  if (!thumbnails) return null
  const order = ["maxres", "standard", "high", "medium", "default"] as const
  for (const key of order) {
    const t = thumbnails[key]
    if (t?.width && t?.height) {
      return t.width < t.height
    }
  }
  return null
}

interface VideoDetails {
  durationSeconds: number
  isPortrait: boolean | null
  hasShortTag: boolean
}

/**
 * Fetches duration and thumbnail aspect ratio for a list of video IDs.
 * Uses part=contentDetails,snippet in a single batched call — no extra quota cost.
 */
async function fetchVideoDetailsMap(
  accessToken: string,
  videoIds: string[]
): Promise<Map<string, VideoDetails>> {
  const map = new Map<string, VideoDetails>()
  const unique = [...new Set(videoIds)]
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const data = await ytFetch<{
      items?: {
        id: string
        contentDetails: { duration: string }
        snippet: { thumbnails: YTThumbnailSet; description?: string; tags?: string[] }
      }[]
    }>("/videos", { part: "contentDetails,snippet", id: batch.join(",") }, accessToken)
    for (const item of data.items ?? []) {
      const desc = (item.snippet.description ?? "").toLowerCase()
      const tags = (item.snippet.tags ?? []).map((t: string) => t.toLowerCase())
      const hasShortTag =
        desc.includes("#shorts") ||
        desc.includes("#short") ||
        tags.includes("shorts") ||
        tags.includes("short")
      map.set(item.id, {
        durationSeconds: parseIso8601DurationSeconds(item.contentDetails.duration),
        isPortrait: isPortraitThumbnail(item.snippet.thumbnails),
        hasShortTag,
      })
    }
  }
  return map
}

export async function fetchUploadsPlaylistId(
  accessToken: string,
  channelId: string
): Promise<string> {
  const data = await ytFetch<{ items: YTChannelItem[] }>(
    "/channels",
    { part: "contentDetails", id: channelId },
    accessToken
  )
  const playlist = data.items?.[0]?.contentDetails?.relatedPlaylists.uploads
  if (!playlist) throw new Error(`No uploads playlist for channel ${channelId}`)
  return playlist
}

export async function fetchRecentVideos(
  accessToken: string,
  uploadsPlaylistId: string,
): Promise<Video[]> {
  const data = await ytFetch<{ items: YTPlaylistItem[] }>(
    "/playlistItems",
    {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    },
    accessToken
  )

  const videos = (data.items ?? []).map((item) => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnail: pickBestThumbnailUrl(item.snippet.thumbnails),
    channelId: item.snippet.channelId,
    channelName: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    durationSeconds: undefined as number | undefined,
    isShort: undefined as boolean | undefined,
  }))

  if (videos.length > 0) {
    const SHORT_MAX_SECONDS = 180
    const details = await fetchVideoDetailsMap(
      accessToken,
      videos.map((v) => v.videoId)
    )
    for (const v of videos) {
      const d = details.get(v.videoId)
      if (d === undefined) {
        v.isShort = true // no data — treat conservatively as Short
        continue
      }
      v.durationSeconds = d.durationSeconds
      const tooShort = d.durationSeconds <= SHORT_MAX_SECONDS
      v.isShort = d.hasShortTag || d.isPortrait === true || tooShort
    }
  }

  return videos
}
