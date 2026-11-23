"use client";

import * as React from "react";
import { Bookmark, Check, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusIcon } from "@/components/common/badges";
import { LEARNING_STATUSES, LEARNING_STATUS_LABELS, type LearningStatus } from "@/lib/curriculum";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

/**
 * Learning controls for one question: status, mastered, bookmark, revision.
 * Writes are disabled until stored progress has been loaded, so an early click
 * can never overwrite saved data.
 */
export function QuestionActions({ questionId, className, idPrefix = "actions" }: { questionId: string; className?: string; idPrefix?: string }) {
  const hydrated = useProgressStore((state) => state.hydrated);
  const entry = useProgressStore((state) => state.questions[questionId]);
  const setStatus = useProgressStore((state) => state.setStatus);
  const toggleBookmark = useProgressStore((state) => state.toggleBookmark);
  const toggleRevision = useProgressStore((state) => state.toggleRevision);

  const status: LearningStatus = entry?.status ?? "not-started";
  const mastered = status === "mastered";
  const bookmarked = entry?.bookmarked ?? false;
  const revision = entry?.revision ?? false;
  const selectId = `${idPrefix}-status`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={selectId} className="text-xs text-muted-foreground">
          Learning status
        </Label>
        <Select value={status} onValueChange={(value) => setStatus(questionId, value as LearningStatus)} disabled={!hydrated}>
          <SelectTrigger id={selectId} className="w-full" aria-label="Learning status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEARNING_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <StatusIcon status={value} />
                  {LEARNING_STATUS_LABELS[value]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant={mastered ? "secondary" : "default"}
        className="w-full"
        disabled={!hydrated}
        onClick={() => setStatus(questionId, mastered ? "practicing" : "mastered")}
        aria-pressed={mastered}
      >
        <Check aria-hidden />
        {mastered ? "Mastered · undo" : "Mark as mastered"}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hydrated}
          aria-pressed={bookmarked}
          onClick={() => toggleBookmark(questionId)}
          className={cn(bookmarked && "border-brand/40 bg-brand-subtle text-brand")}
        >
          <Bookmark aria-hidden className={cn(bookmarked && "fill-current")} />
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hydrated}
          aria-pressed={revision}
          onClick={() => toggleRevision(questionId)}
          className={cn(revision && "border-warning/40 bg-warning-subtle text-warning")}
        >
          <Flag aria-hidden className={cn(revision && "fill-current")} />
          {revision ? "To revise" : "Revise later"}
        </Button>
      </div>
    </div>
  );
}
