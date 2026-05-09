# Shorts Horizontal Row in Category Feed

## Context

Currently `fetchRecentVideos` silently drops all YouTube Shorts (videos ≤ 180s / portrait / tagged #shorts). This means channels that post a mix of long-form and Shorts only show their long-form content, and channels that post primarily Shorts may only contribute 1–2 videos or none at all.

The fix: tag Shorts with `isShort: true` instead of dropping them, then render them in a horizontal scrollable row at the top of the category page, above the existing long-form video grid. All existing filters (channel selector, "hide watched" toggle) apply to both sections.

---

## Files to Change

### 1. `src/lib/youtube.ts`

**a) Extend `Video` interface (line 32)**
Add:
```ts
isShort?: boolean
```

**b) Rewrite `fetchRecentVideos` (line 230)**
- Remove `maxResults` param and `options?: { excludeShorts? }` param
- Always fetch `playlistPageSize = 50` (API max — already the effective value today due to the `* 15` formula)
- Keep all detection logic (`hasShortTag`, duration, `isPortrait`) unchanged
- **Instead of filtering**, tag each video: `v.isShort = isShort(v, details)`
  - A video is a Short if: `hasShortTag` OR (duration ≤ 180s AND `isPortrait !== false`) OR (duration > 180s AND `isPortrait === true`)
  - This is the exact inverse of the current `return true` (keep) conditions
- Assign `durationSeconds` as before
- Return all videos (no `.slice(0, maxResults)`)

### 2. `src/app/api/youtube/feed/route.ts`

**a) Remove `CANDIDATES_PER_CHANNEL`; add new constants:**
```ts
const MAX_FEED_VIDEOS = 50     // long-form cap (unchanged)
const MAX_SHORTS_TOTAL = 20    // cap for Shorts in the horizontal row
```

**b) Update `fetchRecentVideos` call (line 73):**
```ts
const videos = await fetchRecentVideos(accessToken, uploadsId)
// (no maxResults or options args)
```

**c) After collecting `allVideos` from all channels (line 86), replace the sort+slice with:**
```ts
const longForm = allVideos
  .filter((v) => !v.isShort)
  .sort(compareByUploadTime)
  .slice(0, MAX_FEED_VIDEOS)
const shorts = allVideos
  .filter((v) => v.isShort)
  .sort(compareByUploadTime)
  .slice(0, MAX_SHORTS_TOTAL)
return [...longForm, ...shorts]
```

**d) Bump cache key in `src/lib/cache.ts`:**
Change `yt:feed:v3:${categoryId}` → `yt:feed:v4:${categoryId}` and update the comment.
(Stale v3 cache has no `isShort` field; all videos would appear as long-form without the bump.)

### 3. `src/components/category-feed.tsx`

**a) Split `videos` state into two derived arrays in one `useMemo`:**
```ts
const { shorts, longForm } = useMemo(() => ({
  shorts: videos.filter((v) => v.isShort),
  longForm: videos.filter((v) => !v.isShort),
}), [videos])
```

**b) Replace the single `visibleVideos` memo with two:**
```ts
const visibleLongForm = useMemo(() => {
  let result = longForm
  if (activeChannelIds?.length) {
    const s = new Set(activeChannelIds)
    result = result.filter((v) => s.has(v.channelId))
  }
  if (hideWatched) result = result.filter((v) => !watchedSet.has(v.videoId))
  return result
}, [longForm, activeChannelIds, hideWatched, watchedSet])

const visibleShorts = useMemo(() => {
  let result = shorts
  if (activeChannelIds?.length) {
    const s = new Set(activeChannelIds)
    result = result.filter((v) => s.has(v.channelId))
  }
  if (hideWatched) result = result.filter((v) => !watchedSet.has(v.videoId))
  return result
}, [shorts, activeChannelIds, hideWatched, watchedSet])
```

**c) Keep `watchedCount` counting across both sections** (already counts from `videos`, no change needed)

**d) Replace the render section.** Above the long-form grid, add a Shorts strip when `visibleShorts.length > 0`:
```tsx
{visibleShorts.length > 0 && (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
      Shorts
    </p>
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {visibleShorts.map((video) => (
        <div key={video.videoId} className="flex-none w-40">
          <VideoCard
            video={video}
            isWatched={watchedSet.has(video.videoId)}
            onToggleWatched={() => { /* same toggle logic */ }}
          />
        </div>
      ))}
    </div>
  </div>
)}
```

The `w-40` (160px) cards use the existing `VideoCard` as-is. `fill`+`object-cover` on the `Image` center-crops portrait thumbnails into the 16:9 container — acceptable without needing a VideoCard variant.

**e) The empty state** should check `visibleLongForm.length === 0 && visibleShorts.length === 0` for the "no videos" state.

---

## Verification

1. Open a category with channels known to post Shorts (e.g. a gaming channel). The Shorts row should appear above the grid.
2. Click a channel pill in the filter bar → Shorts row should update to only show Shorts from that channel; same for the long-form grid.
3. Mark a Short as watched → toggle "Hide watched" → Short disappears from the row; long-form videos still visible.
4. Mark a long-form video watched → toggle "Hide watched" → disappears from grid; Shorts row unaffected (unless those Shorts are also watched).
5. Categories with zero Shorts from their channels should show no Shorts row at all.
6. Check Redis: after first load, cache key should be `yt:feed:v4:{categoryId}`. The old `v3` key can be left to expire naturally.
