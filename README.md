# YouTube Box

Organize your YouTube subscriptions into custom categories and browse focused, algorithm-free feeds.

## What it does

YouTube Box connects to your Google account (read-only), pulls your subscriptions, and lets you group channels into categories like "Tech", "Cooking", or "Music". Each category has its own feed showing the latest uploads from only those channels -- no recommendations, no distractions. You can mark videos as watched to track your progress, and Shorts are detected and separated automatically.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19, Server Components, Server Actions) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components |
| Auth | [NextAuth.js v5](https://authjs.dev) with Google OAuth (requests `youtube.readonly` scope) |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) (connects through `postgres` driver) |
| Caching | [Upstash Redis](https://upstash.com) for YouTube API response caching |
| Validation | [Zod](https://zod.dev) for server action input validation |
| Icons | [Lucide React](https://lucide.dev) |
| Drag & Drop | [@dnd-kit](https://dndkit.com) |
| Deployment | [Vercel](https://vercel.com) |

## Architecture

```
src/
  app/
    page.tsx                          Landing page (redirects to /dashboard if signed in)
    layout.tsx                        Root layout (theme, session, toaster)
    (dashboard)/
      layout.tsx                      Auth guard + sidebar with category list
      dashboard/page.tsx              Category grid overview
      categories/page.tsx             Category management
      categories/[categoryId]/        Category detail + feed
      categories/new/                 Create category form
      subscriptions/page.tsx          Browse all YouTube subscriptions
    api/
      auth/[...nextauth]/route.ts     NextAuth route handler
      youtube/
        subscriptions/route.ts        Paginated subscription list
        feed/route.ts                 Category video feed (long-form + Shorts)
  actions/
    categories.ts                     CRUD for categories (Server Actions)
    channels.ts                       Assign/remove channels to categories
    videos.ts                         Toggle watched state
    auth.ts                           Sign out action
  db/
    schema.ts                         Drizzle schema (users, accounts, sessions, categories, categoryChannels, watchedVideos)
    index.ts                          Database connection
  lib/
    youtube.ts                        YouTube Data API v3 client (subscriptions, uploads, video details)
    tokens.ts                         OAuth token management with automatic refresh
    cache.ts                          Redis cache helpers with TTL (subs: 6h, uploads playlist: 24h, feed: 15m)
    concurrency.ts                    Promise.allSettled with concurrency limit
    emoji.ts                          Auto-emoji picker for category names
    utils.ts                          Tailwind class merge utility
  components/                         UI components (sidebar, video cards, category forms, dialogs, etc.)
```

### How a category feed loads

1. User opens a category page
2. Client fetches `GET /api/youtube/feed?categoryId=...`
3. The route checks the Redis cache -- if fresh (< 15 min), returns cached data
4. On cache miss: looks up all channels in the category, fetches each channel's uploads playlist ID (cached 24h), then fetches recent videos with concurrency-limited parallel requests (max 5 at a time)
5. Video details are enriched with duration and thumbnail aspect ratio to classify Shorts vs long-form
6. Results are sorted by upload time, capped (50 long-form + 20 Shorts), cached, and returned
7. Watched video IDs are fetched from the database and sent alongside so the UI can show watch state

### Auth flow

NextAuth v5 uses the Google provider with `youtube.readonly` scope and `offline` access to get a refresh token. Tokens are stored in the database via the Drizzle adapter. When a YouTube API call is needed, `lib/tokens.ts` checks if the access token is expired and transparently refreshes it using the stored refresh token.

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database
- An Upstash Redis instance
- A Google Cloud project with the YouTube Data API v3 enabled and OAuth 2.0 credentials

### Environment variables

Create a `.env.local` file:

```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Setup

```bash
# Install dependencies
npm install

# Run database migrations
npx drizzle-kit push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to sign in and start organizing.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx drizzle-kit push` | Push schema changes to database |
| `npx drizzle-kit studio` | Open Drizzle Studio (database GUI) |
