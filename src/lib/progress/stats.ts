import {
  CURRICULUM_TARGET,
  DIFFICULTIES,
  DIFFICULTY_META,
  INDUSTRIES,
  INDUSTRY_LABELS,
  type LearningStatus,
} from "../curriculum";
import type { QuestionSummary } from "../../types/content";
import type { ProgressData, QuestionProgress } from "./types";

/**
 * Pure progress aggregation. Every figure here is derived from the loaded
 * question index and the learner's progress; only CURRICULUM_TARGET and the
 * per-difficulty targets (curriculum.ts) are fixed.
 *
 * A question counts as completed ONLY when its status is "mastered".
 * Opening a question page never changes that.
 */

export interface GroupProgress {
  key: string;
  label: string;
  /** Questions currently loaded in this group. */
  loaded: number;
  /** Curriculum target for the group, when one is defined (difficulty only). */
  target?: number;
  mastered: number;
  /** Started = any status other than "not-started". */
  started: number;
  percentOfLoaded: number;
}

export interface ProgressSummary {
  target: number;
  loaded: number;
  mastered: number;
  bookmarked: number;
  revision: number;
  byStatus: Record<LearningStatus, number>;
  percentOfLoaded: number;
  percentOfTarget: number;
  byDifficulty: GroupProgress[];
  byIndustry: GroupProgress[];
  byDomain: GroupProgress[];
  byTopic: GroupProgress[];
}

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export function statusOf(progress: ProgressData["questions"], id: string): LearningStatus {
  return progress[id]?.status ?? "not-started";
}

function group(
  questions: QuestionSummary[],
  progress: ProgressData["questions"],
  keysOf: (question: QuestionSummary) => string[],
  labelOf: (key: string) => string,
  targets?: Record<string, number>,
): GroupProgress[] {
  const buckets = new Map<string, QuestionSummary[]>();
  for (const question of questions) {
    for (const key of keysOf(question)) {
      const list = buckets.get(key);
      if (list) list.push(question);
      else buckets.set(key, [question]);
    }
  }
  return [...buckets.entries()].map(([key, items]) => {
    const mastered = items.filter((q) => statusOf(progress, q.id) === "mastered").length;
    const started = items.filter((q) => statusOf(progress, q.id) !== "not-started").length;
    return {
      key,
      label: labelOf(key),
      loaded: items.length,
      target: targets?.[key],
      mastered,
      started,
      percentOfLoaded: percent(mastered, items.length),
    };
  });
}

export function computeProgress(questions: QuestionSummary[], progress: ProgressData["questions"]): ProgressSummary {
  const loadedIds = new Set(questions.map((q) => q.id));
  const entries: Array<[string, QuestionProgress]> = Object.entries(progress).filter(([id]) => loadedIds.has(id));

  const byStatus: Record<LearningStatus, number> = { "not-started": 0, learning: 0, practicing: 0, mastered: 0 };
  for (const question of questions) byStatus[statusOf(progress, question.id)] += 1;

  const mastered = byStatus.mastered;

  // Difficulty rows always show every level so the curriculum target stays visible.
  const difficultyGroups = group(
    questions,
    progress,
    (q) => [q.difficulty],
    (key) => DIFFICULTY_META[key as keyof typeof DIFFICULTY_META].label,
    Object.fromEntries(DIFFICULTIES.map((d) => [d, DIFFICULTY_META[d].target])),
  );
  const byDifficulty = DIFFICULTIES.map(
    (difficulty): GroupProgress =>
      difficultyGroups.find((g) => g.key === difficulty) ?? {
        key: difficulty,
        label: DIFFICULTY_META[difficulty].label,
        loaded: 0,
        target: DIFFICULTY_META[difficulty].target,
        mastered: 0,
        started: 0,
        percentOfLoaded: 0,
      },
  );

  const industryGroups = group(
    questions,
    progress,
    (q) => q.industries,
    (key) => INDUSTRY_LABELS[key as keyof typeof INDUSTRY_LABELS] ?? key,
  );
  const byIndustry = [...industryGroups].sort(
    (a, b) => orderIndex(INDUSTRIES, a.key) - orderIndex(INDUSTRIES, b.key) || a.label.localeCompare(b.label),
  );

  const sortByLabel = (a: GroupProgress, b: GroupProgress) => a.label.localeCompare(b.label, "en", { numeric: true });

  return {
    target: CURRICULUM_TARGET,
    loaded: questions.length,
    mastered,
    bookmarked: entries.filter(([, p]) => p.bookmarked).length,
    revision: entries.filter(([, p]) => p.revision).length,
    byStatus,
    percentOfLoaded: percent(mastered, questions.length),
    percentOfTarget: percent(mastered, CURRICULUM_TARGET),
    byDifficulty,
    byIndustry,
    byDomain: group(questions, progress, (q) => [q.domain], (key) => key).sort(sortByLabel),
    byTopic: group(questions, progress, (q) => [q.topic], (key) => key).sort(sortByLabel),
  };
}

function orderIndex(list: readonly string[], key: string): number {
  const index = list.indexOf(key);
  return index === -1 ? list.length : index;
}

/**
 * "Continue learning": the most recently viewed question that is not yet
 * mastered; otherwise the first not-mastered question in curriculum order.
 */
export function pickContinueQuestion(
  questions: QuestionSummary[],
  progress: ProgressData,
): QuestionSummary | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const id of progress.recent) {
    const question = byId.get(id);
    if (question && statusOf(progress.questions, id) !== "mastered") return question;
  }
  return questions.find((q) => statusOf(progress.questions, q.id) !== "mastered") ?? null;
}
