"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2, History, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge, StatusLabel } from "@/components/common/badges";
import { EmptyState } from "@/components/common/page";
import { ProgressBreakdown } from "@/components/progress/breakdown";
import { StatCard } from "@/components/progress/stat-card";
import { useProgressSummary } from "@/components/progress/use-progress-summary";
import { CURRICULUM_TARGET, DIFFICULTIES, DIFFICULTY_META } from "@/lib/curriculum";
import { pickContinueQuestion, statusOf } from "@/lib/progress/stats";
import type { QuestionSummary } from "@/types/content";

function Section({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardView({ questions }: { questions: QuestionSummary[] }) {
  const { hydrated, summary, progress, recent } = useProgressSummary(questions);

  const byId = React.useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const continueQuestion = React.useMemo(() => pickContinueQuestion(questions, { questions: progress, recent }), [questions, progress, recent]);
  const continueIsRecent = continueQuestion ? recent.includes(continueQuestion.id) : false;
  const recentQuestions = recent.map((id) => byId.get(id)).filter((q): q is QuestionSummary => q !== undefined).slice(0, 5);

  const loadedPercentOfTarget = Math.round((summary.loaded / CURRICULUM_TARGET) * 100);
  const known = (value: number) => (hydrated ? value : null);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Curriculum target" value={CURRICULUM_TARGET} hint="planned questions" />
        <StatCard label="Loaded" value={summary.loaded} hint={`${loadedPercentOfTarget}% of the target`} />
        <StatCard
          label="Completed"
          value={known(summary.mastered)}
          hint={hydrated ? `${summary.percentOfLoaded}% of loaded` : undefined}
        />
        <StatCard label="Bookmarked" value={known(summary.bookmarked)} hint={hydrated && summary.revision > 0 ? `${summary.revision} to revise` : "saved on this device"} />
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Completion of loaded questions</span>
            <span className="text-muted-foreground tabular-nums">
              {hydrated ? `${summary.mastered} of ${summary.loaded} mastered` : "…"}
            </span>
          </div>
          <Progress value={hydrated ? summary.percentOfLoaded : 0} aria-label="Completion of loaded questions" className="h-2" />
          <p className="text-xs text-muted-foreground">A question counts as completed only when you mark it Mastered. Opening it does not.</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Curriculum loaded</span>
            <span className="text-muted-foreground tabular-nums">
              {summary.loaded} of {CURRICULUM_TARGET}
            </span>
          </div>
          <Progress value={loadedPercentOfTarget} aria-label="Share of the curriculum that is loaded" className="h-2" />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Continue learning">
          {questions.length === 0 ? (
            <EmptyState title="Nothing to study yet" description="Questions appear here once content batches are loaded." />
          ) : !hydrated ? (
            <Skeleton className="h-28 w-full" />
          ) : continueQuestion ? (
            <div className="space-y-3 rounded-lg border p-4" data-testid="continue-card">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{continueQuestion.id}</span>
                  <DifficultyBadge difficulty={continueQuestion.difficulty} className="h-5 text-[11px]" />
                  <StatusLabel status={statusOf(progress, continueQuestion.id)} />
                </p>
                <p className="text-base font-medium">{continueQuestion.topic}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{continueQuestion.question}</p>
              </div>
              <Button asChild size="sm">
                <Link href={`/questions/${continueQuestion.id}`}>
                  <PlayCircle aria-hidden /> {continueIsRecent ? "Continue" : "Start learning"}
                </Link>
              </Button>
            </div>
          ) : (
            <EmptyState title="All loaded questions are mastered" description="Nice work. New questions will show up here as more batches are added." />
          )}
        </Section>

        <Section title="Recently viewed" description="Based on this browser only.">
          {!hydrated ? (
            <Skeleton className="h-28 w-full" />
          ) : recentQuestions.length === 0 ? (
            <EmptyState icon={History} title="Nothing viewed yet" description="Questions you open will be listed here." className="py-8" />
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border" data-testid="recent-list">
              {recentQuestions.map((question) => (
                <li key={question.id}>
                  <Link href={`/questions/${question.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50">
                    <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{question.topic}</span>
                    <StatusLabel status={statusOf(progress, question.id)} className="hidden sm:inline-flex" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Progress breakdown" description="Mastered questions out of those currently loaded.">
        <ProgressBreakdown summary={summary} hydrated={hydrated} initialLimit={6} />
      </Section>

      <Section
        title="Browse curriculum"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/questions">
              All questions <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFICULTIES.map((difficulty) => {
            const group = summary.byDifficulty.find((g) => g.key === difficulty);
            const loaded = group?.loaded ?? 0;
            const target = DIFFICULTY_META[difficulty].target;
            return (
              <Link
                key={difficulty}
                href={`/levels/${difficulty}`}
                className="group rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-center justify-between">
                  <DifficultyBadge difficulty={difficulty} />
                  <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 text-sm font-medium tabular-nums">
                  {loaded} <span className="font-normal text-muted-foreground">of {target} loaded</span>
                </p>
                <Progress value={Math.round((loaded / target) * 100)} className="mt-2 h-1" aria-label={`${DIFFICULTY_META[difficulty].label}: ${loaded} of ${target} loaded`} />
              </Link>
            );
          })}
        </div>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href="/industries">
            <Building2 aria-hidden /> Browse by industry
          </Link>
        </Button>
      </Section>
    </div>
  );
}
