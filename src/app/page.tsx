import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function LandingPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center min-h-screen overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,oklch(0.78_0.12_264/0.18),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,oklch(0.52_0.14_264/0.25),transparent_55%)]"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border/80 bg-card/85 p-8 shadow-xl shadow-black/5 backdrop-blur-md dark:bg-card/70 dark:shadow-black/30 md:p-10">
          <div className="flex flex-col items-center text-center space-y-2">
            <Badge variant="secondary" className="font-medium">
              Subscriptions, organized
            </Badge>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance mt-4">
              YouTube Box
            </h1>
            <p className="text-muted-foreground text-base md:text-[1.05rem] leading-relaxed max-w-[32ch] text-pretty">
              Group channels into categories and open focused feeds whenever you want
              to watch.
            </p>
          </div>

          <form
            className="mt-8 space-y-4"
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <Button type="submit" size="lg" className="w-full h-11 gap-2.5 rounded-xl shadow-sm">
              <svg className="size-[1.15rem]" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed px-1">
              Read-only access to your YouTube subscriptions. We never post or change
              your account.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
