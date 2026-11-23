import {
  DIFFICULTIES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  INDUSTRIES,
  INDUSTRY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  ROLES,
  ROLE_LABELS,
  PRIORITY_ORDER,
  LEARNING_STATUSES,
  humanize,
  labelFor,
  priorityRank,
  type LearningStatus,
} from "../curriculum";
import type { QuestionSummary } from "../../types/content";
import type { ProgressData } from "../progress/types";
import { statusOf } from "../progress/stats";
import { searchQuestionIds } from "./search";

export const ANY = "all";

export interface QuestionFilters {
  query: string;
  difficulty: string;
  topic: string;
  domain: string;
  questionType: string;
  industry: string;
  role: string;
  priority: string;
  status: string;
  bookmarkedOnly: boolean;
  revisionOnly: boolean;
}

export const DEFAULT_FILTERS: QuestionFilters = {
  query: "",
  difficulty: ANY,
  topic: ANY,
  domain: ANY,
  questionType: ANY,
  industry: ANY,
  role: ANY,
  priority: ANY,
  status: ANY,
  bookmarkedOnly: false,
  revisionOnly: false,
};

export const SORT_KEYS = ["relevance", "sequence", "difficulty", "topic", "priority", "recent"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  sequence: "Curriculum order",
  difficulty: "Difficulty",
  topic: "Topic (A-Z)",
  priority: "Priority",
  recent: "Recently viewed",
};

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  difficulty: FilterOption[];
  topic: FilterOption[];
  domain: FilterOption[];
  questionType: FilterOption[];
  industry: FilterOption[];
  role: FilterOption[];
  priority: FilterOption[];
}

function tally(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function ordered(
  counts: Map<string, number>,
  vocabulary: readonly string[],
  labelOf: (value: string) => string,
): FilterOption[] {
  const known = vocabulary.filter((value) => counts.has(value));
  const extra = [...counts.keys()].filter((value) => !vocabulary.includes(value)).sort((a, b) => a.localeCompare(b));
  return [...known, ...extra].map((value) => ({ value, label: labelOf(value), count: counts.get(value) ?? 0 }));
}

/** Filter options derived from whatever is loaded; nothing is hardcoded to five questions. */
export function deriveFacets(questions: QuestionSummary[]): Facets {
  const alpha = (counts: Map<string, number>) => ordered(counts, [], (v) => v);
  return {
    difficulty: ordered(tally(questions.map((q) => q.difficulty)), DIFFICULTIES, (v) => DIFFICULTY_META[v as keyof typeof DIFFICULTY_META]?.label ?? humanize(v)),
    topic: alpha(tally(questions.map((q) => q.topic))),
    domain: alpha(tally(questions.map((q) => q.domain))),
    questionType: ordered(tally(questions.map((q) => q.questionType)), QUESTION_TYPES, (v) => labelFor(QUESTION_TYPE_LABELS, v)),
    industry: ordered(tally(questions.flatMap((q) => q.industries)), INDUSTRIES, (v) => labelFor(INDUSTRY_LABELS, v)),
    role: ordered(tally(questions.flatMap((q) => q.roles)), ROLES, (v) => labelFor(ROLE_LABELS, v)),
    priority: ordered(tally(questions.map((q) => q.priority)), PRIORITY_ORDER, humanize),
  };
}

export interface FilterContext {
  progress: ProgressData;
}

const matchesAll = (value: string) => value === ANY || value === "";

/** Apply structured filters and the text query. Returns ids in relevance order when searching. */
export function filterQuestions(
  questions: QuestionSummary[],
  filters: QuestionFilters,
  context: FilterContext,
): { items: QuestionSummary[]; relevance: Map<string, number> | null } {
  const ranked = searchQuestionIds(questions, filters.query);
  const relevance = ranked ? new Map(ranked.map((id, position) => [id, position])) : null;

  const items = questions.filter((question) => {
    if (relevance && !relevance.has(question.id)) return false;
    if (!matchesAll(filters.difficulty) && question.difficulty !== filters.difficulty) return false;
    if (!matchesAll(filters.topic) && question.topic !== filters.topic) return false;
    if (!matchesAll(filters.domain) && question.domain !== filters.domain) return false;
    if (!matchesAll(filters.questionType) && question.questionType !== filters.questionType) return false;
    if (!matchesAll(filters.industry) && !question.industries.includes(filters.industry)) return false;
    if (!matchesAll(filters.role) && !question.roles.includes(filters.role)) return false;
    if (!matchesAll(filters.priority) && question.priority !== filters.priority) return false;
    if (!matchesAll(filters.status) && statusOf(context.progress.questions, question.id) !== (filters.status as LearningStatus)) {
      return false;
    }
    if (filters.bookmarkedOnly && !context.progress.questions[question.id]?.bookmarked) return false;
    if (filters.revisionOnly && !context.progress.questions[question.id]?.revision) return false;
    return true;
  });

  return { items, relevance };
}

const byCurriculum = (a: QuestionSummary, b: QuestionSummary) =>
  DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.sequence - b.sequence;

export function sortQuestions(
  items: QuestionSummary[],
  sort: SortKey,
  context: FilterContext,
  relevance: Map<string, number> | null,
): QuestionSummary[] {
  const copy = [...items];
  switch (sort) {
    case "relevance":
      if (relevance) return copy.sort((a, b) => (relevance.get(a.id) ?? 0) - (relevance.get(b.id) ?? 0));
      return copy.sort(byCurriculum);
    case "difficulty":
      return copy.sort(
        (a, b) =>
          DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
          priorityRank(a.priority) - priorityRank(b.priority) ||
          a.sequence - b.sequence,
      );
    case "topic":
      return copy.sort((a, b) => a.topic.localeCompare(b.topic, "en", { sensitivity: "base" }) || byCurriculum(a, b));
    case "priority":
      return copy.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byCurriculum(a, b));
    case "recent": {
      const viewed = (q: QuestionSummary) => context.progress.questions[q.id]?.lastViewedAt ?? 0;
      return copy.sort((a, b) => viewed(b) - viewed(a) || byCurriculum(a, b));
    }
    case "sequence":
    default:
      return copy.sort(byCurriculum);
  }
}

/* -------------------------------------------------------------------------- */
/* URL (de)serialisation, so filtered views are shareable and survive refresh  */
/* -------------------------------------------------------------------------- */

const PARAM_FOR: Record<Exclude<keyof QuestionFilters, "bookmarkedOnly" | "revisionOnly">, string> = {
  query: "q",
  difficulty: "difficulty",
  topic: "topic",
  domain: "domain",
  questionType: "type",
  industry: "industry",
  role: "role",
  priority: "priority",
  status: "status",
};

export function filtersFromParams(params: URLSearchParams): { filters: QuestionFilters; sort: SortKey | null } {
  const filters: QuestionFilters = { ...DEFAULT_FILTERS };
  for (const [field, param] of Object.entries(PARAM_FOR) as Array<[keyof typeof PARAM_FOR, string]>) {
    const value = params.get(param);
    if (value) filters[field] = value;
  }
  filters.bookmarkedOnly = params.get("bookmarked") === "1";
  filters.revisionOnly = params.get("revision") === "1";
  const sort = params.get("sort");
  return { filters, sort: (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : null };
}

export function filtersToParams(filters: QuestionFilters, sort: SortKey | null): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, param] of Object.entries(PARAM_FOR) as Array<[keyof typeof PARAM_FOR, string]>) {
    const value = filters[field];
    if (value && value !== ANY) params.set(param, value);
  }
  if (filters.bookmarkedOnly) params.set("bookmarked", "1");
  if (filters.revisionOnly) params.set("revision", "1");
  if (sort) params.set("sort", sort);
  return params;
}

export function activeFilterCount(filters: QuestionFilters): number {
  let count = 0;
  for (const key of ["difficulty", "topic", "domain", "questionType", "industry", "role", "priority", "status"] as const) {
    if (!matchesAll(filters[key])) count += 1;
  }
  if (filters.bookmarkedOnly) count += 1;
  if (filters.revisionOnly) count += 1;
  return count;
}

export { LEARNING_STATUSES };
