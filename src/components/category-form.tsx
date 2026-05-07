"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Category } from "@/db/schema"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
]

type ActionResult = { success: false; error: string } | undefined
type ActionFn = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>

export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: ActionFn
  category?: Category
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name ?? ""}
          placeholder="e.g. Gaming"
          required
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          name="description"
          defaultValue={category?.description ?? ""}
          placeholder="Short description"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label>Color (optional)</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={category?.color === c}
                className="sr-only peer"
              />
              <span
                className="block h-7 w-7 rounded-full ring-2 ring-transparent peer-checked:ring-foreground transition-all"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
          <label className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value=""
              defaultChecked={!category?.color}
              className="sr-only peer"
            />
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs text-muted-foreground peer-checked:border-foreground transition-all">
              ✕
            </span>
          </label>
        </div>
      </div>

      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
