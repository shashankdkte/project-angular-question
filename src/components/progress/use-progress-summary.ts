"use client";

import * as React from "react";
import { useProgressStore } from "@/lib/progress/store";
import { computeProgress } from "@/lib/progress/stats";
import type { QuestionSummary } from "@/types/content";

/**
 * Progress figures for a set of loaded questions. Everything is derived from the
 * question index and the learner's stored progress; nothing is hardcoded.
 * `hydrated` is false until stored progress has been read, so views can avoid
 * flashing misleading zeros.
 */
export function useProgressSummary(questions: QuestionSummary[]) {
  const hydrated = useProgressStore((state) => state.hydrated);
  const progress = useProgressStore((state) => state.questions);
  const recent = useProgressStore((state) => state.recent);
  const summary = React.useMemo(() => computeProgress(questions, progress), [questions, progress]);
  return { hydrated, summary, progress, recent };
}
