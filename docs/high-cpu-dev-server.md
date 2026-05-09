# High CPU Usage During `pnpm dev`

This document catalogues the likely causes of CPU spiking to ~90% when running the development server, ordered from most to least impactful.

---

## 1. Cache Double-Serialisation Bug (Critical — Always Misses Cache)

**File:** `src/lib/cache.ts`

```ts
// ❌ current code
await redis.setex(key, ttlSeconds, JSON.stringify(data))
```

The Upstash Redis client (`@upstash/redis`) **automatically serialises values to JSON** before sending them to Redis. Calling `JSON.stringify` first means the value stored in Redis is a *JSON-encoded string* (e.g. `"\"[{\\\"videoId\\\"...}]\""`) rather than a JSON object.

When the cache is read back with `redis.get<T>(key)`, the client deserialises the outer JSON layer and returns a plain `string` instead of `T`. Because a non-null string is truthy, the hit-check `if (hit !== null)` passes — but callers receive a raw string where they expect a typed object, which causes downstream failures or unexpected behaviour.

**Practical consequence:** Every call to `cached()` effectively bypasses the cache, meaning:
- The `/api/youtube/feed` route fires a full set of YouTube API calls on every page load (uploads-playlist lookup + playlist items + video details batch per channel).
- The `/api/youtube/subscriptions` route re-fetches from YouTube on every paginated scroll.

**Fix:**

```ts
// ✅ remove the manual JSON.stringify — let the client handle it
await redis.setex(key, ttlSeconds, data)
```

---

## 2. Feed Route: Concurrent YouTube API Fanout Per Channel

**File:** `src/app/api/youtube/feed/route.ts`

When the cache misses (see §1), every call to the feed endpoint runs a `Promise.allSettled` across all channels in a category. For each channel this fires:

1. `fetchUploadsPlaylistId` → 1 YouTube API call  
2. `fetchRecentVideos` → 1 `playlistItems` call fetching **up to 50 items** (see §3 below)  
3. `fetchVideoDetailsMap` → 1+ batched `videos` call (up to 50 video IDs at a time)

With 10 channels that is up to **30 outbound HTTPS requests per single feed page load**, all competing for CPU time for TLS handshakes, JSON parsing, and response assembly.

---

## 3. Shorts-Exclusion Inflates Playlist Fetch Size

**File:** `src/lib/youtube.ts`, `fetchRecentVideos`

```ts
const playlistPageSize =
  excludeShorts ? Math.min(50, Math.max(maxResults * 15, 20)) : maxResults
```

`CANDIDATES_PER_CHANNEL` is `20` and `excludeShorts` is always `true` in the feed route:

```
Math.min(50, Math.max(20 × 15, 20))  →  Math.min(50, 300)  →  50
```

Every channel fetch requests **50 playlist items** even though only up to 20 are ultimately kept. This means `fetchVideoDetailsMap` must parse duration and aspect ratio for up to 50 videos per channel on every cache miss.

---

## 4. Subscription Search Triggers a Full Sequential Page Fetch

**File:** `src/components/subscription-list.tsx`

```ts
// Fires when `search` becomes non-empty and pages remain
useEffect(() => {
  if (!search || !nextTokenRef.current || fetchingAllRef.current) return
  // ...
  const fetchAll = async () => {
    let token = nextTokenRef.current
    while (token && !cancelled) {
      const page = await loadPage(token)   // sequential — one at a time
      ...
      token = page.nextPageToken
    }
  }
  fetchAll()
}, [search, loadPage])
```

Typing a single character into the subscriptions search box triggers a sequential waterfall that fetches **every remaining YouTube subscription page** (each page is 50 items; heavy subscribers can have 20+ pages). Each page hits the API route, which calls Redis and YouTube. While sequential rather than parallel, sustained looping keeps the event loop and network stack busy for several seconds.

Additionally, because the subscriptions cache also suffers from the double-serialisation bug (§1), each page fetch bypasses the cache and makes a live YouTube API call.

---

## 5. Turbopack Initial Compilation (Next.js 16 Default)

**File:** `next.config.ts` (no explicit Turbopack config)

Next.js 16 enables **Turbopack by default** in `next dev`. On first start and after cold restarts, Turbopack compiles every module in the dependency graph from scratch, including large libraries like `drizzle-orm`, `next-auth`, `@dnd-kit/core`, `@upstash/redis`, and the entire React 19 tree. This typically causes a CPU spike for 10–30 seconds on first load of each route.

This is generally expected behaviour, but it compounds the other issues — if the cache is broken and a network request arrives during the Turbopack warm-up burst, both processes compete for CPU simultaneously.

If Turbopack is causing persistent (not just startup) high CPU, you can temporarily fall back to webpack to isolate the issue:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  turbopack: false,   // opt out of Turbopack
  ...
}
```

---

## 6. Middleware Runs on Every Matched Request

**File:** `src/proxy.ts`

```ts
export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/(dashboard|subscriptions|categories)(.*)"],
}
```

The middleware re-exports `auth` from NextAuth, which performs a **database session lookup** on every matched request (all dashboard, subscription, and category routes). With `session: { strategy: "database" }` in `src/auth.ts`, this means a Postgres round-trip on every navigation and API call, including the feed and subscriptions API routes triggered by client components. Under concurrent requests this can keep both the Node.js process and the Postgres connection busy.

---

## 7. HMR File Watchers

Next.js dev mode watches the entire `src/` tree for changes. With a large number of component files and TypeScript type-checking on save, each file save triggers a re-compilation pass. This is standard dev behaviour but is worth noting — saving files rapidly (e.g., during active development) will cause repeated CPU bursts.

---

## Summary & Recommended Fixes

| # | Cause | Effort | Impact |
|---|-------|--------|--------|
| 1 | Cache double-serialisation (always misses) | Low | 🔴 Critical |
| 2 | YouTube API fanout on every feed load | Fixed by §1 | 🔴 Critical |
| 3 | Shorts inflation fetches 50 items/channel | Low | 🟠 High |
| 4 | Search triggers full subscription waterfall | Medium | 🟠 High |
| 5 | Turbopack initial compilation | Low (config flag) | 🟡 Medium |
| 6 | Middleware DB session on every request | Medium (session strategy) | 🟡 Medium |
| 7 | HMR file watchers | N/A (normal) | 🟢 Low |

**Start with fix #1** — correcting the `JSON.stringify` in `cache.ts` will immediately make the Redis cache functional, eliminating the repeated YouTube API fanout that is likely the single largest contributor to sustained high CPU.
