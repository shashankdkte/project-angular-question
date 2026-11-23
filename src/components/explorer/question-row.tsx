"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Flag } from "lucide-react";
import { DifficultyBadge, PriorityBadge, StatusIcon, TypeBadge } from "@/components/common/badges";
import { LEARNING_STATUS_LABELS, type LearningStatus } from "@/lib/curriculum";
import type { QuestionSummary } from "@/types/content";

interface QuestionRowProps {
  question: QuestionSummary;
  status: LearningStatus;
  bookmarked: boolean;
  revision: boolean;
  showDifficulty: boolean;
}

/** A single dense list row: scannable at 600 records, entire row is the link. */
export const QuestionRow = React.memo(function QuestionRow({ question, status, bookmarked, revision, showDifficulty }: QuestionRowProps) {
  const showPrompt = question.question.trim().replace(/\?$/, "") !== question.topic.trim().replace(/\?$/, "");
  return (
    <li className="row-lazy" data-testid="question-row" data-question-id={question.id}>
      <Link
        href={`/questions/${question.id}`}
        className="group flex items-start gap-3 rounded-md px-3 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
      >
        <span className="mt-0.5" title={LEARNING_STATUS_LABELS[status]}>
          <StatusIcon status={status} />
          <span className="sr-only">{LEARNING_STATUS_LABELS[status]}</span>
        </span>

        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
            <span className="min-w-0 text-sm font-medium group-hover:text-foreground">{question.topic}</span>
          </span>
          {showPrompt && <span className="line-clamp-1 block text-[13px] text-muted-foreground">{question.question}</span>}
          <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {showDifficulty && <DifficultyBadge difficulty={question.difficulty} className="h-5 text-[11px]" />}
            <TypeBadge type={question.questionType} className="h-5 text-[11px]" />
            <PriorityBadge priority={question.priority} className="h-5 text-[11px]" />
            <span className="text-xs text-muted-foreground">{question.domain}</span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2 pt-0.5 text-muted-foreground">
          {revision && (
            <span title="Marked for revision">
              <Flag aria-hidden className="size-4 fill-warning text-warning" />
              <span className="sr-only">Marked for revision</span>
            </span>
          )}
          {bookmarked && (
            <span title="Bookmarked">
              <Bookmark aria-hidden className="size-4 fill-brand text-brand" />
              <span className="sr-only">Bookmarked</span>
            </span>
          )}
          <span className="hidden text-xs tabular-nums sm:inline">{question.readingMinutes} min</span>
        </span>
      </Link>
    </li>
  );
});
