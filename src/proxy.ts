import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Just gate on cookie presence. Full session validation happens in
// server components (src/auth.ts `auth()`) and server actions.
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("authjs.session-token") ||
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
