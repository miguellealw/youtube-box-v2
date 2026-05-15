import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAccessToken, ReauthRequiredError } from "@/lib/tokens"
import { fetchSubscriptionPage } from "@/lib/youtube"
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  // "first" is the sentinel for the first page (no YouTube pageToken)
  const rawToken = request.nextUrl.searchParams.get("pageToken")
  const cacheToken = rawToken ?? "first"

  try {
    const accessToken = await getAccessToken(userId)
    const page = await cached(
      CACHE_KEYS.subscriptionPage(userId, cacheToken),
      CACHE_TTL.subscriptions,
      () => fetchSubscriptionPage(accessToken, rawToken ?? undefined)
    )
    return NextResponse.json(page)
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      return NextResponse.json(
        { error: "reauth_required" },
        { status: 401 }
      )
    }
    console.error("subscriptions route error:", err)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}
