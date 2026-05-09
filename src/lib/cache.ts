import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key)
  if (hit !== null) return hit

  const data = await fn()
  await redis.setex(key, ttlSeconds, JSON.stringify(data))
  return data
}

export async function invalidate(key: string): Promise<void> {
  await redis.del(key)
}

export const CACHE_KEYS = {
  // per-page: token "first" = first page, otherwise the YouTube pageToken value
  subscriptionPage: (userId: string, token: string) =>
    `yt:subs:${userId}:page:${token}`,
  uploadsPlaylist: (channelId: string) => `yt:uploads:${channelId}`,
  /** bump version when feed merge/sort semantics change (invalidates stale cache) */
  feed: (categoryId: string) => `yt:feed:v3:${categoryId}`,
} as const

export const CACHE_TTL = {
  subscriptions: 6 * 60 * 60,       // 6 hours
  uploadsPlaylist: 24 * 60 * 60,    // 24 hours
  feed: 15 * 60,                     // 15 minutes
} as const
