import { z } from "zod";
import { DIFFICULTIES, QUESTION_TYPES } from "../curriculum";
import { AnswerSchema } from "./answer";

/** Batch-level metadata (the schema requires these fields; extra fields are preserved). */
export const BatchMetaSchema = z.looseObject({
  id: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES),
  questionRange: z.looseObject({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
  }),
  questionCount: z.number().int().positive(),
  curriculumVersion: z.string().min(1),
});
export type BatchMeta = z.output<typeof BatchMetaSchema>;

export const SourceNotesSchema = z.looseObject({
  status: z.string().optional(),
  verifiedAgainstRuntime: z.boolean().optional(),
  frameworkSpecific: z.boolean().optional(),
});
export type SourceNotes = z.output<typeof SourceNotesSchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  difficulty: z.enum(DIFFICULTIES),
  domain: z.string().min(1),
  topic: z.string().min(1),
  question: z.string().min(1),
  questionType: z.enum(QUESTION_TYPES),
  priority: z.string().min(1),
  roles: z.array(z.string()),
  industries: z.array(z.string()),
  tags: z.array(z.string()),
  answer: AnswerSchema,
  learningOutcomes: z.array(z.string()),
  sourceNotes: SourceNotesSchema,
});
export type SourceQuestion = z.output<typeof QuestionSchema>;

/** Envelope of one JSON batch file, as supplied. */
export const QuestionBatchSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  dataset: z.string().min(1),
  batch: BatchMetaSchema,
  answerSectionOrder: z.array(z.string()).length(15),
  questions: z.array(z.unknown()).min(1),
});
