"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { parseResultsContext, readResultsContextRaw } from "@/lib/results-context";

const subscribeNoop = () => () => {};

export interface NavTarget {
  id: string;
  title: string;
}

export interface QuestionNav {
  backHref: string;
  backLabel: string;
  previous: NavTarget | null;
  next: NavTarget | null;
  position: { index: number; total: number; scope: "results" | "curriculum" };
}

export interface CurriculumNeighbors {
  previous: NavTarget | null;
  next: NavTarget | null;
  position: number;
  total: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=dialog]") !== null;
}

/**
 * Previous/next follow the list the learner came from (filtered/sorted results)
 * when it contains this question; otherwise they follow curriculum order.
 * `[` and `]` navigate from the keyboard when not typing.
 */
export function useQuestionNavigation(questionId: string, curriculum: CurriculumNeighbors): QuestionNav {
  const router = useRouter();
  // sessionStorage is read as an external store: the server and first client render see "no context"
  // (curriculum order), then the real list takes over without a hydration mismatch.
  const raw = React.useSyncExternalStore(subscribeNoop, readResultsContextRaw, () => null);
  const items = React.useMemo(() => parseResultsContext(raw), [raw]);

  const nav = React.useMemo<QuestionNav>(() => {
    const index = items ? items.items.findIndex((item) => item.id === questionId) : -1;
    if (items && index !== -1) {
      return {
        backHref: items.href,
        backLabel: "Back to results",
        previous: items.items[index - 1] ?? null,
        next: items.items[index + 1] ?? null,
        position: { index: index + 1, total: items.items.length, scope: "results" },
      };
    }
    return {
      backHref: "/questions",
      backLabel: "All questions",
      previous: curriculum.previous,
      next: curriculum.next,
      position: { index: curriculum.position, total: curriculum.total, scope: "curriculum" },
    };
  }, [items, questionId, curriculum]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === "[" && nav.previous) router.push(`/questions/${nav.previous.id}`);
      if (event.key === "]" && nav.next) router.push(`/questions/${nav.next.id}`);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nav, router]);

  return nav;
}
