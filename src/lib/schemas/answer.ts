import { z } from "zod";

/**
 * Zod models for the *nested* answer content.
 *
 * The canonical JSON Schema (schemas/question_batch_schema_v1.json) validates
 * the batch envelope and question metadata, but leaves most answer sections as
 * a bare `{ "type": "object" }`. These models describe the structure the real
 * data uses (verified against beginner_01_questions_001_005.json) so that
 * renderers can rely on it at runtime.
 *
 * Design rules:
 *  - Objects are "loose": unknown extra fields are preserved (never silently
 *    dropped) and surfaced by the generic fallback renderer.
 *  - Fields that could plausibly arrive as a string OR a list (code
 *    explanation, verification command) are normalised to arrays.
 */

const nonEmpty = z.string().trim().min(1, "must not be empty");
const stringList = z.array(z.string());

/** Accepts `"text"` or `["a", "b"]` and normalises to `string[]`. */
const stringOrList = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.trim() === "" ? [] : [value]));

export const DefinitionSchema = z.looseObject({
  text: nonEmpty,
});

export const MotivationSchema = z.looseObject({
  whyIntroduced: nonEmpty,
  historicalNote: z.string().optional(),
});

export const ProblemSolvedSchema = z.looseObject({
  before: nonEmpty,
  after: nonEmpty,
  benefits: stringList.default([]),
});

export const SimpleAnalogySchema = z.looseObject({
  title: nonEmpty,
  explanation: nonEmpty,
});

export const IndustryExampleSchema = z.looseObject({
  industry: nonEmpty,
  scenario: nonEmpty,
  implementation: nonEmpty,
  businessImpact: nonEmpty,
  importantConstraint: z.string().optional(),
});

export const DiagramSchema = z.looseObject({
  id: nonEmpty,
  type: nonEmpty,
  title: nonEmpty,
  mermaid: nonEmpty,
  caption: z.string().optional(),
});

export const EndToEndFlowSchema = z.looseObject({
  steps: stringList.default([]),
  diagrams: z.array(DiagramSchema).default([]),
});

export const CodeExampleSchema = z.looseObject({
  language: nonEmpty,
  filename: z.string().optional(),
  runtime: z.string().optional(),
  code: nonEmpty,
  explanation: stringOrList.default([]),
});

export const ProjectExperienceSchema = z.looseObject({
  /** "hypothetical" in all supplied data; anything else is treated with care by the UI. */
  status: nonEmpty,
  example: nonEmpty,
  evidenceToCollect: stringList.default([]),
  doNotClaim: z.string().optional(),
});

/** Alternatives are objects with a `name`; other properties vary and are mapped dynamically. */
export const AlternativeSchema = z.union([
  z.looseObject({ name: nonEmpty }),
  nonEmpty.transform((name) => ({ name })),
]);

export const TestCaseSchema = z.looseObject({
  case: nonEmpty,
  expected: nonEmpty,
});

export const TestingSchema = z.looseObject({
  strategy: nonEmpty,
  testCases: z.array(TestCaseSchema).default([]),
  negativeCases: stringList.default([]),
  verificationCommand: stringOrList.default([]),
});

export const FOLLOW_UP_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
export type FollowUpLevel = (typeof FOLLOW_UP_LEVELS)[number];

export const FollowUpsSchema = z.looseObject({
  beginner: stringList.default([]),
  intermediate: stringList.default([]),
  advanced: stringList.default([]),
  expert: stringList.default([]),
});

export const AnswerSchema = z.object({
  definition: DefinitionSchema,
  motivation: MotivationSchema,
  problemSolved: ProblemSolvedSchema,
  characteristics: stringList,
  simpleAnalogy: SimpleAnalogySchema,
  industryExample: IndustryExampleSchema,
  useCases: stringList,
  endToEndFlow: EndToEndFlowSchema,
  codeExample: CodeExampleSchema,
  projectExperience: ProjectExperienceSchema,
  pitfalls: stringList,
  whenNotToUse: stringList,
  alternatives: z.array(AlternativeSchema),
  testing: TestingSchema,
  followUps: FollowUpsSchema,
  finalTakeaway: nonEmpty,
});

export type Answer = z.output<typeof AnswerSchema>;
export type Diagram = z.output<typeof DiagramSchema>;
export type Alternative = z.output<typeof AlternativeSchema>;
export type TestCase = z.output<typeof TestCaseSchema>;
