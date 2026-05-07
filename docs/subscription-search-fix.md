# Plan: Auto-fetch all subscription pages on search

## Context

The subscriptions page uses infinite scroll pagination (50 channels/page via YouTube API, cached in Redis). The search filter (`subscription-list.tsx:194`) only searches already-loaded items, so channels on unloaded pages are invisible to search. Fix: when the user types in the search box and there are still pages to load, automatically fetch all remaining pages in the background so the full subscription list becomes searchable.

## Approach

Only one file changes: `src/components/subscription-list.tsx`.

### New state / refs

```ts
const [fetchingAll, setFetchingAll] = useState(false)
const fetchingAllRef = useRef(false)
```

### New useEffect — trigger on search change

Add after the IntersectionObserver effect (line ~174). Fires whenever `search` changes. When search is non-empty and there are remaining pages and a fetch isn't already in flight, start a sequential loop:

```ts
useEffect(() => {
  if (!search || !nextTokenRef.current || fetchingAllRef.current) return

  let cancelled = false
  fetchingAllRef.current = true
  setFetchingAll(true)

  const fetchAll = async () => {
    let token = nextTokenRef.current
    while (token && !cancelled) {
      const page = await loadPage(token)
      if (cancelled) break
      setItems((prev) => dedupeSubscriptionsByChannelId([...prev, ...page.items]))
      token = page.nextPageToken
      nextTokenRef.current = page.nextPageToken
      setNextPageToken(page.nextPageToken)
    }
  }

  fetchAll()
    .catch(() => { if (!cancelled) setError("Failed to load all subscriptions for search.") })
    .finally(() => {
      fetchingAllRef.current = false
      setFetchingAll(false)
    })

  return () => { cancelled = true }
}, [search, loadPage])
```

**Why `cancelled` flag**: the cleanup cancels the loop if `search` changes mid-fetch. Because `fetchingAllRef.current` stays `true` while a fetch is running, subsequent effect invocations bail out at the guard — avoiding double-fetching.

### Guard the IntersectionObserver

In the existing observer callback, add `!fetchingAllRef.current` to the condition so scroll-triggered loads don't race with the background fetch:

```ts
if (
  entries[0].isIntersecting &&
  nextTokenRef.current &&
  !loadingMoreRef.current &&
  !fetchingAllRef.current   // ← add this
)
```

### UX changes

- Placeholder: `"Search loaded subscriptions…"` → `"Search subscriptions…"`
- Show a small inline indicator when `fetchingAll === true`. Place it inside the sticky header, below the flex row that holds the input and layout buttons:

```tsx
{fetchingAll && (
  <span className="text-xs text-muted-foreground animate-pulse">
    Loading all subscriptions…
  </span>
)}
```

## Critical file

- `src/components/subscription-list.tsx` — only file that changes

## Verification

1. Load the subscriptions page — first page of 50 channels loads normally.
2. Type any character in the search box — observe the "Loading all subscriptions…" indicator appears.
3. Confirm subsequent pages are fetched (network tab: multiple `/api/youtube/subscriptions?pageToken=…` requests).
4. Once all pages load, the indicator disappears and the search results are complete.
5. Clear the search — list returns to all loaded channels, scroll still works.
6. Reload the page — channels load from Redis cache (fast), repeat search works immediately.
7. Confirm the IntersectionObserver still works normally when no search term is active.
