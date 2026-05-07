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

export async function fetchAllSubscriptions(accessToken: string): Promise<Subscription[]> {
  const subs: Subscription[] = []
  let pageToken: string | undefined

  do {
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

    for (const item of data.items ?? []) {
      subs.push({
        channelId: item.snippet.resourceId.channelId,
        channelName: item.snippet.title,
        channelThumbnail:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          "",
        subscriberCount: "",
        description: item.snippet.description,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  if (subs.length === 0) return subs

  // Enrich with subscriber counts in batches of 50
  const ids = subs.map((s) => s.channelId)
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const data = await ytFetch<{ items: YTChannelItem[] }>(
      "/channels",
      { part: "snippet,statistics", id: batch.join(",") },
      accessToken
    )
    const countMap = new Map(
      (data.items ?? []).map((c) => [
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

  return subs
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
