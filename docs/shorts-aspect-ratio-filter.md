# Improving the Shorts Filter — Aspect Ratio Detection

## Problem

The current filter in `src/lib/youtube.ts` treats any video **≤ 120 seconds** as a Short and drops it. Two failure modes remain:

1. **False negatives** — Shorts that are exactly 60 s but were uploaded as full landscape videos slip through because the duration cut-off is too coarse.
2. **False positives (rare)** — A legitimate 90-second news clip gets dropped.

The root cause is that YouTube's Data API v3 has no first-class `isShort` flag. The most reliable proxy we can use (without hitting the undocumented `/shorts/{id}` redirect trick) is the **thumbnail aspect ratio**: Shorts are vertical (9:16, portrait), while regular uploads are horizontal (16:9, landscape).

---

## Solution: Combine Duration + Aspect Ratio

Use **both signals together** — a video is classified as a Short only when *both* conditions are true:

| Signal | Short threshold |
|---|---|
| Duration | `≤ 120 s` |
| Thumbnail aspect ratio | portrait (`width < height`) |

This makes the filter more precise without adding any new API calls, because the thumbnail URLs we already fetch encode the resolution in the URL **or** the `snippet.thumbnails` object already carries `width` / `height` for some keys.

---

## How YouTube Thumbnail Dimensions Work

The `snippet.thumbnails` object returned by `playlistItems.list` and `videos.list` includes optional `width` and `height` fields per size key:

```json
"thumbnails": {
  "maxres": { "url": "...", "width": 1280, "height": 720 },
  "standard": { "url": "...", "width": 640, "height": 480 },
  "high":     { "url": "...", "width": 480, "height": 360 },
  "medium":   { "url": "...", "width": 320, "height": 180 },
  "default":  { "url": "...", "width": 120, "height": 90  }
}
```

For Shorts the dimensions are flipped — e.g. `"high": { "width": 360, "height": 480 }`.

> **Caveat:** `width`/`height` are not guaranteed to be present on every key or every video. The implementation must fall back gracefully to duration-only filtering when dimensions are missing.

---

## Implementation Plan

### Step 1 — Extend TypeScript types

In `src/lib/youtube.ts`, update `YTThumbnailSet` so each entry also carries optional `width` / `height`:

```ts
type YTThumbnailSet = Partial<
  Record<
    "maxres" | "standard" | "high" | "medium" | "default",
    { url?: string; width?: number; height?: number }
  >
>
```

No API change needed — these fields are already returned, we just weren't typing them.

### Step 2 — Add a `isPortraitThumbnail` helper

```ts
/**
 * Returns true when the best available thumbnail dimensions are portrait (width < height).
 * Returns null when no dimension data is available (caller should not use this signal).
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
  return null // no dimension data
}
```

### Step 3 — Pass thumbnails through the video pipeline

Currently `fetchRecentVideos` discards the raw thumbnail object after picking the best URL. We need to keep it long enough to run the aspect-ratio check.

**Option A (preferred — no extra API call):** Attach the raw `thumbnails` object to the internal `videos` array temporarily, run the filter, then drop it before returning.

```ts
// inside fetchRecentVideos — internal working type only
type VideoWithMeta = Video & {
  _thumbnails?: YTThumbnailSet
}
```

Map `item.snippet.thumbnails` into `_thumbnails`, run filters, then delete `_thumbnails` before `return`.

**Option B (alternative):** Fetch dimensions from `videos.list?part=snippet` at the same time we already fetch `contentDetails` for durations (they can share the same batch call — just add `snippet` to `part`). This is cleaner because `videos.list` thumbnails tend to be more complete than `playlistItems.list` thumbnails, but it costs one extra `part` (still same API quota unit count since you're batching).

> **Recommendation: go with Option B.** Combine `part=contentDetails,snippet` in `fetchVideoDurationSecondsMap` (or rename it to `fetchVideoDetailsMap`), return both duration and thumbnail dimensions.

### Step 4 — Update `fetchVideoDurationSecondsMap` → `fetchVideoDetailsMap`

```ts
interface VideoDetails {
  durationSeconds: number
  isPortrait: boolean | null
}

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
        snippet: { thumbnails: YTThumbnailSet }
      }[]
    }>(
      "/videos",
      { part: "contentDetails,snippet", id: batch.join(",") },
      accessToken
    )
    for (const item of data.items ?? []) {
      map.set(item.id, {
        durationSeconds: parseIso8601DurationSeconds(item.contentDetails.duration),
        isPortrait: isPortraitThumbnail(item.snippet.thumbnails),
      })
    }
  }
  return map
}
```

### Step 5 — Update the filter logic in `fetchRecentVideos`

```ts
if (excludeShorts) {
  const SHORT_MAX_SECONDS = 120
  videos = videos.filter((v) => {
    const tooShort = (v.durationSeconds ?? Infinity) <= SHORT_MAX_SECONDS
    if (!tooShort) return true          // definitely not a Short by duration alone
    const portrait = details.get(v.videoId)?.isPortrait
    if (portrait === null || portrait === undefined) return false // no aspect data → be conservative, drop it
    return !portrait                    // keep only if landscape
  })
}
```

This means:
- Long videos (> 120 s) → always kept, no aspect check needed.
- Short videos (≤ 120 s) + portrait → dropped (Short).
- Short videos (≤ 120 s) + landscape → kept (e.g. a 60-second news clip).
- Short videos (≤ 120 s) + no dimension data → dropped (conservative default, same as before).

---

## API Quota Impact

Fetching `part=contentDetails,snippet` vs `part=contentDetails` costs the **same number of quota units** (both are 1 unit per `videos.list` call regardless of how many `part` values are requested). There is zero additional quota cost.

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/youtube.ts` | Extend `YTThumbnailSet` type; add `isPortraitThumbnail`; rename + update `fetchVideoDurationSecondsMap`; update filter in `fetchRecentVideos` |

No changes needed to the route handlers, actions, components, or DB schema.

---

## Testing Checklist

- [ ] A known Short (e.g. `dQw4w9WgXcW` swapped for a real Short ID) is filtered out — both duration *and* portrait signals fire.
- [ ] A 60-second landscape video is **not** filtered out.
- [ ] A video whose thumbnail has no `width`/`height` fields is conservatively dropped when ≤ 120 s.
- [ ] A video > 120 s is never dropped regardless of thumbnail dimensions.
- [ ] No change in quota usage compared to baseline (verify in Google Cloud Console).
