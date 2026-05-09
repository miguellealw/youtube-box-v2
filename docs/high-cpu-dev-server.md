# High CPU Usage During `pnpm dev`

This document catalogues the causes of CPU spiking to ~90% when running the development server, split into two categories: **startup** (no page loaded yet) and **runtime** (while the app is being used).

---

## Startup CPU Spike (No Page Loaded)

### Root Cause: Proxy Eagerly Compiles a Massive Dependency Tree

**File:** `src/proxy.ts`

```ts
export { auth as proxy } from "@/auth"
```

This is the primary cause of the startup CPU spike.

In Next.js 16, two things changed that combine to make this very expensive:

1. **Turbopack is now the default bundler.** Unlike page routes (which Turbopack compiles lazily, only when first requested), the proxy file is compiled **eagerly at startup** — it must be ready before the server can accept any request.

2. **The proxy now defaults to the Node.js runtime** (it was the Edge runtime in earlier versions). This means Turbopack now compiles the *full* Node.js dependency tree that `src/proxy.ts` pulls in through `@/auth`:

   ```
   next-auth
   └── @auth/drizzle-adapter
       └── drizzle-orm
           └── postgres (native driver)
   ```

   These are large packages with deep import graphs. Compiling all of them on a cold Turbopack start is what causes the sustained CPU spike before any page is touched.

   Previously, with Edge runtime, any attempt to import Node.js-only packages (like `postgres`) would have failed at compile time, naturally keeping the proxy dependency tree small. The Node.js runtime removes that guard.

**Fix:**

Keep the proxy lightweight — only check for cookie *presence* (a fast, synchronous operation). Move all real authentication logic into server components and server actions, where it already runs per-request anyway.

```ts
// src/proxy.ts — lightweight replacement
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Just gate on cookie presence. Full session validation happens in
// server components (src/auth.ts `auth()`) and server actions.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    const loginUrl = new URL("/", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/(dashboard|subscriptions|categories)(.*)"],
}
```

> **Note:** The proxy should never be the sole auth check. As the Next.js 16 docs warn: *"Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone."* The `auth()` call in layout/page server components already does the real session validation — the proxy just prevents an unnecessary round-trip to render a protected page for a clearly unauthenticated user.

---

### Turbopack Filesystem Cache

The Next.js 16 docs confirm that `turbopackFileSystemCacheForDev` is **enabled by default**. This means the second and subsequent `pnpm dev` runs should be significantly faster because Turbopack reuses its compiled output from `.next/turbopack/`.

#### `.next/turbopack` must be a directory, not a file

The Turbopack cache requires `.next/turbopack/` to be a **directory**. If a 0-byte file named `turbopack` exists at that path instead, the cache can never be written or read, making **every `pnpm dev` run a cold start**.

This was the confirmed cause of the persistent CPU spike in this project. The fix is to delete the entire `.next` folder and let Turbopack recreate it correctly:

```bash
rm -rf .next
pnpm dev
```

After this, `.next/turbopack/` will be created as a proper directory and subsequent runs will be fast.

#### Other reasons the cache may be invalidated

If CPU is still high on **warm restarts** after the above fix, the cache is being invalidated between runs. Common causes:
- The `.next` folder is being deleted between runs (e.g. a `clean` script)
- A dependency changed (pnpm store update, lockfile change)
- A config file that Turbopack watches changed (`tsconfig.json`, `postcss.config.mjs`, `next.config.ts`)

You can generate a Turbopack trace to investigate further:
```bash
NEXT_TURBOPACK_TRACING=1 pnpm dev
# Produces .next/dev/trace-turbopack — attach to a GitHub issue or inspect manually
```

---

## Runtime CPU (While Using the App)

These issues don't cause the startup spike but will cause CPU bursts during normal use.

### 1. Cache Double-Serialisation Bug ✅ Fixed

**File:** `src/lib/cache.ts`

`JSON.stringify(data)` was passed to the Upstash Redis client, which also serialises automatically. This caused every cache read to return a raw string instead of a typed object, making the cache always miss. Fixed by removing the manual `JSON.stringify`.

### 2. YouTube API Fanout on Cache Miss ✅ Fixed

**File:** `src/app/api/youtube/feed/route.ts`

On a cache miss, `Promise.allSettled` fired all channel fetches simultaneously (uploads playlist + playlist items + video details per channel). Fixed by replacing with `allSettledLimited(..., 5)` from `src/lib/concurrency.ts`, capping concurrent channel fetches at 5.

### 3. Shorts-Exclusion Inflates Playlist Fetch Size

**File:** `src/lib/youtube.ts`, `fetchRecentVideos`

With `excludeShorts: true` and `maxResults = 20` (the `CANDIDATES_PER_CHANNEL` constant), the playlist page size formula evaluates to:

```
Math.min(50, Math.max(20 × 15, 20))  →  50
```

Every channel fetch requests **50 playlist items** even though at most 20 are kept. `fetchVideoDetailsMap` must then parse duration and aspect-ratio data for all 50 on every cache miss. The multiplier of 15 is very aggressive — consider reducing it or capping it lower.

### 4. Subscription Search Triggers a Full Sequential Page Fetch

**File:** `src/components/subscription-list.tsx`

Typing into the subscriptions search box triggers a sequential `while` loop that fetches every remaining YouTube subscription page until none are left. Each page hits the API route. With many subscribers this is a sustained burst of sequential network + parse work.

### 5. Middleware DB Session on Every Request

**File:** `src/auth.ts` + `src/proxy.ts`

With `session: { strategy: "database" }`, the `auth()` call in server components and layouts does a Postgres round-trip on every page render. If the proxy fix above is applied, the proxy itself no longer adds a DB call — but each server component that calls `auth()` still does. This is inherent to database sessions; consider JWT sessions if it becomes a bottleneck.

---

## Summary

| # | Cause | Phase | Status |
|---|-------|-------|--------|
| — | Proxy eagerly compiles `next-auth` + `drizzle` + `postgres` at startup | Startup | 🔴 Needs fix |
| — | Turbopack cold cache (first ever run) | Startup | 🟡 Expected; warms up |
| 1 | Cache double-serialisation (always misses) | Runtime | ✅ Fixed |
| 2 | YouTube API fanout on cache miss | Runtime | ✅ Fixed |
| 3 | Shorts inflation fetches 50 items/channel | Runtime | 🟠 Needs fix |
| 4 | Search triggers full subscription waterfall | Runtime | 🟠 Needs fix |
| 5 | DB session lookup on every server render | Runtime | 🟡 By design |
