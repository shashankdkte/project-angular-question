import { z } from "zod";
import { LEARNING_STATUSES, type LearningStatus } from "../curriculum";

/**
 * Learning progress is keyed by stable question id (never array position) and
 * stored completely separately from question content.
 */
export interface QuestionProgress {
  status: LearningStatus;
  bookmarked: boolean;
  /** Marked as difficult / to revisit. */
  revision: boolean;
  notes: string;
  /** Epoch ms of the most recent time the question page was opened. */
  lastViewedAt?: number;
  /** Epoch ms when the question was marked Mastered; cleared when status changes away. */
  completedAt?: number;
  updatedAt: number;
}

export interface ProgressData {
  questions: Record<string, QuestionProgress>;
  /** Most recently viewed question ids, newest first. */
  recent: string[];
}

/** Bump when the persisted shape changes and add a step to `migrations` in migrate.ts. */
export const PROGRESS_VERSION = 1;
export const PROGRESS_STORAGE_KEY = "angular-mastery:progress";
export const MAX_RECENT = 25;

export const QuestionProgressSchema = z.object({
  status: z.enum(LEARNING_STATUSES).catch("not-started"),
  bookmarked: z.boolean().catch(false),
  revision: z.boolean().catch(false),
  notes: z.string().catch(""),
  lastViewedAt: z.number().optional().catch(undefined),
  completedAt: z.number().optional().catch(undefined),
  updatedAt: z.number().catch(0),
});

export const ProgressDataSchema = z.object({
  questions: z.record(z.string(), QuestionProgressSchema).catch({}),
  recent: z.array(z.string()).catch([]),
});

/** File format for user-initiated export/import. */
export const PROGRESS_EXPORT_APP = "angular-mastery";
export const ProgressExportSchema = z.object({
  app: z.literal(PROGRESS_EXPORT_APP),
  kind: z.literal("progress"),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.unknown(),
});

export function emptyProgress(): ProgressData {
  return { questions: {}, recent: [] };
}

export function emptyQuestionProgress(now = Date.now()): QuestionProgress {
  return { status: "not-started", bookmarked: false, revision: false, notes: "", updatedAt: now };
}

export type { LearningStatus };
