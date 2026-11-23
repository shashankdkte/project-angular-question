"use client";

import * as React from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { StatusIcon } from "@/components/common/badges";
import { ProgressBreakdown } from "@/components/progress/breakdown";
import { ProgressDataCard } from "@/components/progress/progress-data-card";
import { StatCard } from "@/components/progress/stat-card";
import { useProgressSummary } from "@/components/progress/use-progress-summary";
import { LEARNING_STATUSES, LEARNING_STATUS_LABELS } from "@/lib/curriculum";
import type { QuestionSummary } from "@/types/content";

export function ProgressView({ questions }: { questions: QuestionSummary[] }) {
  const { hydrated, summary, progress } = useProgressSummary(questions);
  const known = (value: number) => (hydrated ? value : null);
  const revisionQuestions = questions.filter((question) => progress[question.id]?.revision);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Loaded" value={summary.loaded} hint={`of ${summary.target} planned`} />
        <StatCard label="Completed" value={known(summary.mastered)} hint={hydrated ? `${summary.percentOfLoaded}% of loaded · ${summary.percentOfTarget}% of target` : undefined} />
        <StatCard label="Bookmarked" value={known(summary.bookmarked)} />
        <StatCard label="To revise" value={known(summary.revision)} />
      </div>

      <section aria-labelledby="status-heading" className="space-y-3">
        <h2 id="status-heading" className="text-base font-semibold tracking-tight">
          By learning status
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEARNING_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
              <StatusIcon status={status} />
              <span className="text-sm">{LEARNING_STATUS_LABELS[status]}</span>
              <span className="ml-auto text-sm font-medium tabular-nums" data-testid={`status-count-${status}`}>
                {hydrated ? summary.byStatus[status] : "–"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="breakdown-heading" className="space-y-3">
        <h2 id="breakdown-heading" className="text-base font-semibold tracking-tight">
          Progress breakdown
        </h2>
        <ProgressBreakdown summary={summary} hydrated={hydrated} initialLimit={10} />
      </section>

      <section aria-labelledby="revision-heading" className="space-y-3">
        <h2 id="revision-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Flag aria-hidden className="size-4 text-warning" /> Revise later
        </h2>
        {!hydrated ? null : revisionQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing marked for revision. Use “Revise later” on a question to collect it here.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border">
            {revisionQuestions.map((question) => (
              <li key={question.id}>
                <Link href={`/questions/${question.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50">
                  <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{question.topic}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProgressDataCard />
    </div>
  );
}
