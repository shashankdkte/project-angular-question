import type { Answer } from "../lib/schemas/answer";
import type { BatchMeta, SourceNotes } from "../lib/schemas/question";
import type { Difficulty, QuestionType } from "../lib/curriculum";

export type { Answer, BatchMeta, SourceNotes };

/* -------------------------------------------------------------------------- */
/* Normalised content                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight record used by every list/search/dashboard view. One per
 * question. Contains no answer body, so the index stays small for 600+ rows.
 */
export interface QuestionSummary {
  id: string;
  sequence: number;
  difficulty: Difficulty;
  domain: string;
  topic: string;
  /** Full question text as written in the source. */
  question: string;
  questionType: QuestionType;
  priority: string;
  roles: string[];
  industries: string[];
  tags: string[];
  /** `answer.industryExample.industry`: the industry featured in the worked example. */
  exampleIndustry: string;
  batchId: string;
  /** Deep Dive reading estimate, in minutes. */
  readingMinutes: number;
  diagramCount: number;
}

/** Per-question detail loaded on demand by the question page. */
export interface QuestionRecord extends Omit<QuestionSummary, "readingMinutes" | "diagramCount" | "exampleIndustry"> {
  answer: Answer;
  learningOutcomes: string[];
  sourceNotes: SourceNotes;
  /** Section order exactly as declared by the source batch. */
  answerSectionOrder: string[];
  batch: BatchMeta;
  /** Path of the source JSON, relative to data/questions. */
  sourceFile: string;
  /** Estimated reading effort per section, in seconds (used for per-mode estimates). */
  sectionSeconds: Record<string, number>;
}

export interface BatchSummary {
  id: string;
  difficulty: Difficulty;
  questionRange: { start: number; end: number };
  questionCount: number;
  curriculumVersion: string;
  sourceFile: string;
}

export interface ContentIndex {
  /** Version of this generated index format (not the source schema). */
  indexVersion: 1;
  generatedAt: string;
  dataset: string | null;
  total: number;
  questions: QuestionSummary[];
  batches: BatchSummary[];
}

/* -------------------------------------------------------------------------- */
/* Validation reporting                                                        */
/* -------------------------------------------------------------------------- */

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  /** Stable machine-readable code, e.g. "duplicate-id". */
  code: string;
  /** Source file relative to the data directory (forward slashes). */
  file: string;
  message: string;
  questionId?: string;
  /** JSON path inside the file, e.g. questions[2].answer.characteristics. */
  path?: string;
}

export interface FileReport {
  file: string;
  accepted: boolean;
  batchId?: string;
  questionCount: number;
}

export interface ContentReport {
  generatedAt: string;
  filesDiscovered: number;
  filesAccepted: number;
  filesRejected: number;
  questionsAccepted: number;
  errors: number;
  warnings: number;
  files: FileReport[];
  issues: ValidationIssue[];
}
