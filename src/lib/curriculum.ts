/**
 * Curriculum configuration.
 *
 * This is the ONLY place that encodes facts about the planned program
 * (targets, identifier vocabularies, display labels). Everything else the app
 * shows (counts, filters, progress) is derived from loaded content.
 *
 * Importable from both Node scripts and the Next.js app: no browser or Next
 * dependencies allowed here.
 */

export const CURRICULUM_TARGET = 600;

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                  */
/* -------------------------------------------------------------------------- */

export const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  /**
   * Question-ID prefix for the difficulty. The supplied schema fixes
   * `ANG-BEG-###` for Beginner; the remaining prefixes follow the same
   * `ANG-<3 letters>-###` convention and are the only assumption made about
   * the not-yet-supplied levels. Change them here if the real data differs.
   */
  idPrefix: string;
  /** Curriculum target for the difficulty. */
  target: number;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  beginner: { id: "beginner", label: "Beginner", idPrefix: "ANG-BEG", target: 135 },
  intermediate: { id: "intermediate", label: "Intermediate", idPrefix: "ANG-INT", target: 165 },
  advanced: { id: "advanced", label: "Advanced", idPrefix: "ANG-ADV", target: 165 },
  expert: { id: "expert", label: "Expert", idPrefix: "ANG-EXP", target: 135 },
};

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Question types, roles, industries, priorities                               */
/* -------------------------------------------------------------------------- */

export const QUESTION_TYPES = ["conceptual", "coding", "debugging", "scenario", "architecture"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  conceptual: "Conceptual",
  coding: "Coding",
  debugging: "Debugging",
  scenario: "Scenario-Based",
  architecture: "Architecture / System Design",
};

export const ROLES = [
  "software-engineer",
  "senior-software-engineer",
  "technical-lead",
  "technical-architect",
  "solution-architect",
] as const;
export type RoleId = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleId, string> = {
  "software-engineer": "Software Engineer",
  "senior-software-engineer": "Senior Software Engineer",
  "technical-lead": "Technical Lead",
  "technical-architect": "Technical Architect",
  "solution-architect": "Solution Architect",
};

export const INDUSTRIES = ["banking", "ecommerce", "healthcare", "logistics", "saas"] as const;
export type IndustryId = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<IndustryId, string> = {
  banking: "Banking",
  ecommerce: "E-Commerce",
  healthcare: "Healthcare",
  logistics: "Logistics",
  saas: "Enterprise SaaS",
};

/**
 * Priority is an open string in the schema. Known values are ranked for
 * sorting; unknown values sort last and trigger a content-quality warning.
 */
export const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

export function priorityRank(priority: string): number {
  const index = (PRIORITY_ORDER as readonly string[]).indexOf(priority);
  return index === -1 ? PRIORITY_ORDER.length : index;
}

export function labelFor<T extends string>(map: Record<T, string>, id: string): string {
  return (map as Record<string, string>)[id] ?? humanize(id);
}

export function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/* Answer sections                                                             */
/* -------------------------------------------------------------------------- */

/** The 15 required answer sections, in the canonical order. */
export const ANSWER_SECTION_KEYS = [
  "definition",
  "motivation",
  "problemSolved",
  "characteristics",
  "simpleAnalogy",
  "industryExample",
  "useCases",
  "endToEndFlow",
  "codeExample",
  "projectExperience",
  "pitfalls",
  "whenNotToUse",
  "alternatives",
  "testing",
  "followUps",
] as const;
export type AnswerSectionKey = (typeof ANSWER_SECTION_KEYS)[number];

export interface AnswerSectionMeta {
  key: AnswerSectionKey;
  /** Full heading shown on the page. */
  title: string;
  /** Compact label for the on-this-page navigation. */
  shortTitle: string;
}

export const ANSWER_SECTION_META: Record<AnswerSectionKey, AnswerSectionMeta> = {
  definition: { key: "definition", title: "Definition", shortTitle: "Definition" },
  motivation: { key: "motivation", title: "Why it was introduced", shortTitle: "Why introduced" },
  problemSolved: { key: "problemSolved", title: "Problem solved", shortTitle: "Problem solved" },
  characteristics: { key: "characteristics", title: "Key characteristics", shortTitle: "Characteristics" },
  simpleAnalogy: { key: "simpleAnalogy", title: "Simple analogy", shortTitle: "Analogy" },
  industryExample: { key: "industryExample", title: "Industry example", shortTitle: "Industry example" },
  useCases: { key: "useCases", title: "Use cases", shortTitle: "Use cases" },
  endToEndFlow: { key: "endToEndFlow", title: "End-to-end flow", shortTitle: "End-to-end flow" },
  codeExample: { key: "codeExample", title: "Code example", shortTitle: "Code example" },
  projectExperience: { key: "projectExperience", title: "Project experience", shortTitle: "Project experience" },
  pitfalls: { key: "pitfalls", title: "Pitfalls and edge cases", shortTitle: "Pitfalls" },
  whenNotToUse: { key: "whenNotToUse", title: "When not to use", shortTitle: "When not to use" },
  alternatives: { key: "alternatives", title: "Alternatives", shortTitle: "Alternatives" },
  testing: { key: "testing", title: "Testing and verification", shortTitle: "Testing" },
  followUps: { key: "followUps", title: "Follow-up questions", shortTitle: "Follow-ups" },
};

export function isAnswerSectionKey(value: string): value is AnswerSectionKey {
  return (ANSWER_SECTION_KEYS as readonly string[]).includes(value);
}

/** Title for a section key, falling back gracefully for future/unknown keys. */
export function sectionTitle(key: string): string {
  return isAnswerSectionKey(key) ? ANSWER_SECTION_META[key].title : humanize(key);
}

export function sectionShortTitle(key: string): string {
  return isAnswerSectionKey(key) ? ANSWER_SECTION_META[key].shortTitle : humanize(key);
}

/* -------------------------------------------------------------------------- */
/* Reading modes (presentation only; never filters or mutates content)         */
/* -------------------------------------------------------------------------- */

export const READING_MODES = ["quick", "standard", "deep"] as const;
export type ReadingMode = (typeof READING_MODES)[number];
export const DEFAULT_READING_MODE: ReadingMode = "standard";

export interface ReadingModeMeta {
  id: ReadingMode;
  label: string;
  description: string;
  /** Sections expanded by default. All other sections stay available, collapsed. */
  expanded: readonly string[];
}

export const READING_MODE_META: Record<ReadingMode, ReadingModeMeta> = {
  quick: {
    id: "quick",
    label: "Quick Review",
    description: "Definition, key characteristics and the final takeaway.",
    expanded: ["definition", "characteristics"],
  },
  standard: {
    id: "standard",
    label: "Standard Learning",
    description: "Definition through code: motivation, analogy, example, use cases and flow.",
    expanded: [
      "definition",
      "motivation",
      "problemSolved",
      "simpleAnalogy",
      "industryExample",
      "useCases",
      "endToEndFlow",
      "codeExample",
    ],
  },
  deep: {
    id: "deep",
    label: "Deep Dive",
    description: "All 15 sections: diagrams, testing, anti-patterns and follow-ups.",
    expanded: ANSWER_SECTION_KEYS,
  },
};

export function isReadingMode(value: unknown): value is ReadingMode {
  return typeof value === "string" && (READING_MODES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Learning status                                                             */
/* -------------------------------------------------------------------------- */

export const LEARNING_STATUSES = ["not-started", "learning", "practicing", "mastered"] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export const LEARNING_STATUS_LABELS: Record<LearningStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  practicing: "Practicing",
  mastered: "Mastered",
};
