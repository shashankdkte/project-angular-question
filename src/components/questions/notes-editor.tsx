"use client";

import * as React from "react";
import { NotebookPen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useProgressStore } from "@/lib/progress/store";

const SAVE_DELAY_MS = 500;

/** Personal notes, stored with progress (LocalStorage) and never written to question content. */
export function NotesEditor({ questionId }: { questionId: string }) {
  const hydrated = useProgressStore((state) => state.hydrated);
  const stored = useProgressStore((state) => state.questions[questionId]?.notes ?? "");
  const setNotes = useProgressStore((state) => state.setNotes);

  // `draft` is only non-null while the user has unsaved edits; otherwise the store is the source of truth
  // (which also makes the field correct when stored notes load a moment after first render).
  const [draft, setDraft] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = React.useRef<string | null>(null);

  const flush = React.useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    setNotes(questionId, pending.current);
    pending.current = null;
    setDraft(null);
    setSaved(true);
  }, [questionId, setNotes]);

  // Never lose edits when navigating away.
  React.useEffect(() => flush, [flush]);

  const value = draft ?? stored;

  return (
    <section aria-labelledby={`notes-${questionId}`} className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id={`notes-${questionId}`} className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <NotebookPen aria-hidden className="size-4 text-muted-foreground" /> Your notes
        </h2>
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {draft !== null ? "Saving…" : saved ? "Saved on this device" : "Stored on this device only"}
        </span>
      </div>
      <Textarea
        value={value}
        disabled={!hydrated}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          pending.current = next;
          setSaved(false);
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, SAVE_DELAY_MS);
        }}
        onBlur={flush}
        rows={4}
        placeholder="Add your own notes, gotchas or examples for this question…"
        aria-label="Personal notes for this question"
        className="min-h-24 resize-y text-sm"
      />
    </section>
  );
}
