import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FolderOpen,
  Play,
  Eye,
  ArrowRight,
  Layers,
  Shield,
} from "lucide-react"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  )
}

function SignInForm({ size = "lg" }: { size?: "default" | "lg" }) {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("google", { redirectTo: "/dashboard" })
      }}
    >
      <Button
        type="submit"
        size={size}
        className="gap-2.5 rounded-xl shadow-sm cursor-pointer"
      >
        <GoogleIcon className="size-[1.15rem]" />
        Sign in with Google
      </Button>
    </form>
  )
}

const features = [
  {
    icon: FolderOpen,
    title: "Custom Categories",
    description:
      "Group your subscriptions into categories like Tech, Cooking, or Music. You decide how to organize.",
  },
  {
    icon: Play,
    title: "Focused Feeds",
    description:
      "Open a category and see only those channels' latest videos. No algorithm, no distractions.",
  },
  {
    icon: Eye,
    title: "Track Progress",
    description:
      "Mark videos as watched so you always know where you left off. Shorts are supported too.",
  },
]

const steps = [
  {
    number: "1",
    title: "Sign in",
    description: "Connect your Google account. We only read your subscriptions.",
  },
  {
    number: "2",
    title: "Create categories",
    description: "Group channels by topic, mood, or however you like.",
  },
  {
    number: "3",
    title: "Watch on your terms",
    description: "Open a category feed and watch what matters to you.",
  },
]

export default async function LandingPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="relative flex flex-col min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-20%,oklch(0.78_0.12_264/0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-20%,oklch(0.52_0.14_264/0.22),transparent_60%)]"
        aria-hidden
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10 md:py-6">
        <div className="flex items-center gap-2.5">
          <Layers className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">YouTube Box</span>
        </div>
        <SignInForm size="default" />
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <Badge variant="secondary" className="font-medium mb-5">
          Free &middot; Open source &middot; Privacy-first
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance max-w-2xl">
          Your YouTube subscriptions,{" "}
          <span className="text-primary">organized</span>
        </h1>
        <p className="mt-5 text-muted-foreground text-lg md:text-xl leading-relaxed max-w-xl text-pretty">
          Stop scrolling through hundreds of channels. Create categories, open
          focused feeds, and watch what actually matters to you.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <SignInForm />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Read-only access. We never post or change your account.
          </p>
        </div>
      </section>

      {/* Preview mockup */}
      <section className="relative z-10 px-6 md:px-10 pb-20 md:pb-28">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-card/60 dark:shadow-black/30 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { emoji: "💻", name: "Tech", count: 12 },
              { emoji: "🎮", name: "Gaming", count: 8 },
              { emoji: "🍳", name: "Cooking", count: 5 },
              { emoji: "🎵", name: "Music", count: 15 },
            ].map((cat) => (
              <div
                key={cat.name}
                className="rounded-xl border border-border/60 bg-background/80 p-3 md:p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {cat.count} channels
                </p>
                <div className="flex -space-x-1.5">
                  {Array.from({ length: Math.min(cat.count, 4) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="size-5 rounded-full bg-muted ring-2 ring-background"
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Your dashboard — categories at a glance
        </p>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-10 pb-20 md:pb-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">
            Everything you need to take control
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-3 backdrop-blur-sm"
              >
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 md:px-10 pb-20 md:pb-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">
            Up and running in minutes
          </h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={step.number} className="flex gap-4 items-start">
                <div className="flex items-center justify-center size-8 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {step.number}
                </div>
                <div className="pt-0.5">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 mt-2 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-6 md:px-10 pb-24 md:pb-32">
        <div className="mx-auto max-w-md text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Ready to organize?
          </h2>
          <p className="text-muted-foreground text-sm">
            Sign in with your Google account to get started. It only takes a few
            seconds.
          </p>
          <SignInForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-border/60 px-6 py-6 md:px-10">
        <div className="mx-auto max-w-4xl flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Layers className="size-3.5" />
            <span>YouTube Box</span>
          </div>
          <p>Your subscriptions, your way.</p>
        </div>
      </footer>
    </main>
  )
}
