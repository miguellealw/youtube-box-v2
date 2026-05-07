"use client"

import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { PRESET_EMOJIS, getEmojiForCategory } from "@/lib/emoji"
import type { Category } from "@/db/schema"

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
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    category?.emoji ?? getEmojiForCategory(category?.name ?? "") ?? "📁"
  )

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
          onChange={(e) => {
            if (!category) setSelectedEmoji(getEmojiForCategory(e.target.value) ?? "📁")
          }}
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
        <Label>Emoji</Label>
        <input type="hidden" name="emoji" value={selectedEmoji} />
        <div className="flex gap-1 flex-wrap">
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setSelectedEmoji(e)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted",
                selectedEmoji === e && "ring-2 ring-foreground bg-muted"
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: <span className="text-base">{selectedEmoji}</span>
        </p>
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
