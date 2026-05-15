import { db } from "@/db"
import { accounts } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export class ReauthRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReauthRequiredError"
  }
}

export async function getAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1)

  if (!account) throw new Error("No Google account linked for user")

  const nowInSeconds = Math.floor(Date.now() / 1000)
  const isExpired = account.expires_at && account.expires_at < nowInSeconds + 60

  if (!isExpired && account.access_token) {
    return account.access_token
  }

  if (!account.refresh_token) {
    throw new ReauthRequiredError("No refresh token — user must re-authenticate")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (err.includes("invalid_grant")) {
      throw new ReauthRequiredError(`Token refresh failed: ${err}`)
    }
    throw new Error(`Token refresh failed: ${err}`)
  }

  const tokens = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  await db
    .update(accounts)
    .set({
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))

  return tokens.access_token
}
