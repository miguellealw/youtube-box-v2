const YT_API = "https://www.googleapis.com/youtube/v3"

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
    thumbnails: { default?: { url: string }; medium?: { url: string } }
    description: string
  }
}

interface YTChannelItem {
  id: string
  snippet: { thumbnails: { medium?: { url: string }; default?: { url: string } } }
  statistics: { subscriberCount?: string }
  contentDetails?: { relatedPlaylists: { uploads: string } }
}

interface YTPlaylistItem {
  snippet: {
    resourceId: { videoId: string }
    title: string
    thumbnails: { medium?: { url: string }; default?: { url: string } }
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
    channelThumbnail:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "",
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
          thumbnail:
            c.snippet.thumbnails.medium?.url ??
            c.snippet.thumbnails.default?.url,
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
  maxResults = 5
): Promise<Video[]> {
  const data = await ytFetch<{ items: YTPlaylistItem[] }>(
    "/playlistItems",
    {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(maxResults),
    },
    accessToken
  )

  return (data.items ?? []).map((item) => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "",
    channelId: item.snippet.channelId,
    channelName: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  }))
}
