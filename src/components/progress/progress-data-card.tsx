"use client";

import * as React from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseProgressExport, serializeProgress } from "@/lib/progress/export-import";
import { useProgressStore } from "@/lib/progress/store";
import type { ProgressData } from "@/lib/progress/types";

/** Back up, move, merge or reset progress. All of it stays in this browser unless the learner exports it. */
export function ProgressDataCard() {
  const hydrated = useProgressStore((state) => state.hydrated);
  const replaceAll = useProgressStore((state) => state.replaceAll);
  const mergeIn = useProgressStore((state) => state.mergeIn);
  const reset = useProgressStore((state) => state.reset);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<ProgressData | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const exportProgress = () => {
    const { questions, recent } = useProgressStore.getState();
    const blob = new Blob([serializeProgress({ questions, recent })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `angular-mastery-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Progress exported");
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = parseProgressExport(await file.text());
    if (!result.ok) {
      toast.error("Import failed", { description: result.error });
      return;
    }
    setPending(result.data);
  };

  const pendingCount = pending ? Object.keys(pending.questions).length : 0;

  return (
    <section aria-labelledby="progress-data-heading" className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 id="progress-data-heading" className="text-base font-semibold tracking-tight">
          Your data
        </h2>
        <p className="text-sm text-muted-foreground">
          Progress, bookmarks and notes live in this browser only. Export a file to back it up or move it to another device.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportProgress} disabled={!hydrated}>
          <Download aria-hidden /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!hydrated}>
          <Upload aria-hidden /> Import JSON
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmReset(true)} disabled={!hydrated}>
          <RotateCcw aria-hidden /> Reset progress
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} aria-label="Choose a progress export file" tabIndex={-1} />
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import progress</DialogTitle>
            <DialogDescription>
              This file has progress for {pendingCount} question{pendingCount === 1 ? "" : "s"}. Merge keeps what you have and uses the most
              recently updated entry per question. Replace discards your current progress first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pending) replaceAll(pending);
                setPending(null);
                toast.success("Progress replaced");
              }}
            >
              Replace
            </Button>
            <Button
              onClick={() => {
                if (pending) mergeIn(pending);
                setPending(null);
                toast.success("Progress merged");
              }}
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all progress?</DialogTitle>
            <DialogDescription>
              This removes statuses, bookmarks, revision marks, notes and recent history from this browser. Question content is not affected.
              Export first if you may want it back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                reset();
                setConfirmReset(false);
                toast.success("Progress reset");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
