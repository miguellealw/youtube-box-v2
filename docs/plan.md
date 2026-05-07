# YouTube Subscription Organizer — Implementation Plan

## Context

Building a greenfield full-stack web app that lets users connect their YouTube account via Google OAuth, organize their subscriptions into custom categories, and view a per-category video feed (recent uploads from the channels they assigned to that category). The repo at `/Users/miguel/dev/youtube-box-v2` is completely empty.

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router, TypeScript) | Server Components + Server Actions |
| Database | **Supabase** (PostgreSQL) | Free tier, great dashboard, standard PG connection string |
| ORM | Drizzle ORM | Type-safe, schema-as-code |
| DB driver | `postgres` (postgres.js) | Connect to Supabase Transaction Mode (port 6543) |
| Auth | Auth.js v5 (NextAuth v5) | Google OAuth provider, database sessions |
| Caching | Upstash Redis | Serverless Redis; TTL-based cache for YouTube API responses |
| UI | Tailwind CSS + shadcn/ui | New York style, CSS variables |
| Validation | Zod | Server action input validation |
| Deployment | Vercel | Zero-config for Next.js |

## Database Schema (6 tables — all managed in Drizzle)

Auth.js manages `users`, `accounts`, `sessions`, `verification_tokens`.

**`categories`**
```
id          text PK DEFAULT gen_random_uuid()
userId      text FK→users(id) ON DELETE CASCADE
name        text NOT NULL
description text
color       text  (hex e.g. "#ef4444")
createdAt   timestamptz DEFAULT now()
updatedAt   timestamptz DEFAULT now()
UNIQUE(userId, name)
```

**`category_channels`** (denormalized — channel metadata stored here, no separate channels table)
```
id               text PK DEFAULT gen_random_uuid()
categoryId       text FK→categories(id) ON DELETE CASCADE
userId           text FK→users(id) ON DELETE CASCADE
channelId        text NOT NULL  (YouTube channel ID)
channelName      text NOT NULL
channelThumbnail text
subscriberCount  text
addedAt          timestamptz DEFAULT now()
UNIQUE(categoryId, channelId)
```

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                    # root layout, SessionProvider
│   ├── page.tsx                      # landing / sign-in page
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── youtube/
│   │       ├── subscriptions/route.ts  # GET: all subscriptions (cached)
│   │       └── feed/route.ts           # GET: videos for a category (cached)
│   └── (dashboard)/
│       ├── layout.tsx                # auth guard + sidebar shell
│       ├── dashboard/page.tsx        # category overview grid
│       ├── subscriptions/page.tsx    # browse + assign subscriptions
│       └── categories/
│           ├── page.tsx              # list categories
│           ├── new/page.tsx          # create form
│           └── [categoryId]/
│               ├── page.tsx          # category feed
│               └── edit/page.tsx     # edit form
├── auth.ts                           # Auth.js config
├── middleware.ts                     # protect dashboard routes
├── db/
│   ├── index.ts                      # postgres.js client + Drizzle instance
│   └── schema.ts                     # all table definitions
├── lib/
│   ├── youtube.ts                    # YouTube API wrapper (pure functions)
│   ├── cache.ts                      # Upstash Redis client + cached() helper
│   └── tokens.ts                     # getAccessToken() with refresh logic
├── actions/
│   ├── categories.ts                 # createCategory, updateCategory, deleteCategory
│   └── channels.ts                   # assignChannel, removeChannel
└── components/
    ├── ui/                           # shadcn/ui components
    ├── sidebar.tsx
    ├── category-card.tsx
    ├── channel-card.tsx
    ├── video-card.tsx
    ├── subscription-list.tsx
    ├── category-feed.tsx
    └── assign-channel-dialog.tsx
```

## YouTube API Strategy

**Never use `search.list` (100 units/call).** Use this 2-step pattern instead:
1. `channels.list?part=contentDetails` (1 unit) → get `relatedPlaylists.uploads` ID
2. `playlistItems.list?part=snippet` (1 unit) → get recent videos

A 10-channel category costs 20 units total vs. 1,000 with search.list.

**Scopes:** `openid email profile https://www.googleapis.com/auth/youtube.readonly`

**Redis cache keys + TTLs:**
```
yt:subs:{userId}           → full subscription list      TTL 6h
yt:uploads:{channelId}     → upload playlist ID           TTL 24h
yt:feed:{categoryId}       → video list for category      TTL 15min
```

## Auth Flow (critical config)

```typescript
// src/auth.ts
Google({
  authorization: {
    params: {
      scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",   // get refresh_token
      prompt: "consent",        // force refresh_token every sign-in
    },
  },
})
```

`src/lib/tokens.ts` — `getAccessToken(userId)`: reads `accounts` table, refreshes via `https://oauth2.googleapis.com/token` if `expires_at` is stale, updates DB, returns valid access token.

## Implementation Order

### Phase 1 — Bootstrap
1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router, `src/` dir, `@/*` alias
2. `npx shadcn@latest init` (New York, CSS variables) + add components: `button card dialog input label badge skeleton scroll-area sonner`
3. Install: `next-auth@beta @auth/drizzle-adapter drizzle-orm postgres @upstash/redis zod`
4. Install dev: `drizzle-kit`
5. Create `.env.local`

### Phase 2 — Database
6. Write `src/db/schema.ts` — all 6 tables
7. Write `src/db/index.ts` — postgres.js pointing to Supabase Transaction Mode (port 6543)
8. Write `drizzle.config.ts`
9. `npx drizzle-kit generate` → `npx drizzle-kit migrate`
10. Verify tables in Supabase dashboard

### Phase 3 — Auth
11. Write `src/auth.ts` with Google provider config (offline access, consent prompt, DrizzleAdapter)
12. Write `src/app/api/auth/[...nextauth]/route.ts`
13. Write `src/middleware.ts` protecting `(dashboard)` routes
14. Write root `layout.tsx` with `SessionProvider`
15. Write landing `page.tsx` with Google sign-in button
16. **Verify:** `accounts.refresh_token` is NOT null after sign-in

### Phase 4 — Token Layer + YouTube Client
17. Write `src/lib/tokens.ts` — `getAccessToken(userId)` with refresh
18. Write `src/lib/cache.ts` — Upstash client + `cached<T>(key, ttl, fn)` helper
19. Write `src/lib/youtube.ts` — `fetchAllSubscriptions()`, `fetchChannelDetails()`, `fetchUploadsPlaylistId()`, `fetchRecentVideos()`
20. Write `/api/youtube/subscriptions/route.ts`
21. Write `/api/youtube/feed/route.ts`
22. **Verify:** Cache hit on second request (<50ms), Upstash keys visible in console

### Phase 5 — Category CRUD
23. Write `src/actions/categories.ts` (Zod validation, auth guard, `{ success, error }` return)
24. Write dashboard layout + `sidebar.tsx`
25. Write categories list, new, and edit pages
26. **Verify:** Create/rename/delete → DB rows correct, cascade delete works

### Phase 6 — Subscription Browser + Channel Assignment
27. Write `src/actions/channels.ts` — `assignChannel`, `removeChannel` (invalidates `yt:feed:{categoryId}`)
28. Write `subscription-list.tsx` (client component, fetches `/api/youtube/subscriptions`)
29. Write `assign-channel-dialog.tsx` (shadcn Dialog, lists user's categories)
30. Write `/subscriptions/page.tsx`
31. **Verify:** Assign channel → `category_channels` row in DB, feed cache invalidated

### Phase 7 — Category Feed
32. Write `video-card.tsx` (thumbnail, title, channel, relative time, YouTube link)
33. Write `category-feed.tsx` (client component, fetches `/api/youtube/feed?categoryId=X`)
34. Write `/categories/[categoryId]/page.tsx`
35. **Verify:** Videos sorted by `publishedAt` desc, cache hit on second load

### Phase 8 — Dashboard + Polish
36. Write `category-card.tsx` (name, channel count, channel thumbnails, link to feed)
37. Write `/dashboard/page.tsx` (grid of category cards)
38. Add loading skeletons, empty states, Sonner toasts on mutations
39. Configure `next.config.ts` image domains: `i.ytimg.com`, `yt3.ggpht.com`

## Environment Variables

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Supabase: use **Transaction Mode** connection string (port 6543, not 5432) for serverless compatibility.  
Google Cloud Console: add authorized redirect URI `http://localhost:3000/api/auth/callback/google`.

## Verification Checklist

- [ ] Sign in → `users` + `accounts` rows in Supabase, `refresh_token` non-null
- [ ] `/api/youtube/subscriptions` → 200 JSON, Redis key set
- [ ] Second hit to subscriptions API → <50ms (cache hit)
- [ ] Create / rename / delete category → DB reflects changes
- [ ] Assign channel → `category_channels` row, feed cache key deleted
- [ ] Category page → videos from assigned channels, sorted newest first
- [ ] Same channel assigned to 2 categories → no duplicate errors
- [ ] Google Cloud Console: quota usage well under 500 units after full session
