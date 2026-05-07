import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAccessToken } from "@/lib/tokens"
import { fetchAllSubscriptions } from "@/lib/youtube"
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const accessToken = await getAccessToken(userId)
    const subscriptions = await cached(
      CACHE_KEYS.subscriptions(userId),
      CACHE_TTL.subscriptions,
      () => fetchAllSubscriptions(accessToken)
    )
    return NextResponse.json(subscriptions)
  } catch (err) {
    console.error("subscriptions route error:", err)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}
