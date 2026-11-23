import {
  ANSWER_SECTION_KEYS,
  CURRICULUM_TARGET,
  DIFFICULTIES,
  DIFFICULTY_META,
  INDUSTRIES,
  PRIORITY_ORDER,
  ROLES,
  isDifficulty,
  type Difficulty,
} from "../curriculum";
import { findUnsafeConstruct, detectDiagramKind } from "../diagrams/mermaid-safety";
import { isKnownCodeLanguage } from "../code/languages";
import { QuestionBatchSchema, QuestionSchema, type BatchMeta, type SourceQuestion } from "../schemas/question";
import type { ValidationIssue } from "../../types/content";
import { countWords } from "./text";
import { formatSchemaError, type QuestionBatchValidators } from "./schema-validators";

export interface ValidatedBatch {
  /** Path relative to the data directory, forward slashes. */
  file: string;
  dataset: string;
  batch: BatchMeta;
  answerSectionOrder: string[];
  questions: SourceQuestion[];
}

export interface BatchValidationResult {
  batch?: ValidatedBatch;
  issues: ValidationIssue[];
}

type IssueExtras = { questionId?: string; path?: string };

function makeIssue(
  severity: ValidationIssue["severity"],
  code: string,
  file: string,
  message: string,
  extras: IssueExtras = {},
): ValidationIssue {
  return { severity, code, file, message, ...extras };
}

function zodPath(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") return `${acc}[${segment}]`;
    return acc ? `${acc}.${String(segment)}` : String(segment);
  }, "");
}

/**
 * Validate one batch file in three clearly separated layers:
 *
 *  1. STRUCTURAL  - canonical JSON Schema (Ajv) + nested Zod shapes. Failures
 *     are errors and the batch is rejected.
 *  2. SEMANTIC    - cross-field rules the schema cannot express (counts,
 *     section order, id/sequence agreement, identifier vocabularies). Also
 *     errors.
 *  3. QUALITY     - warnings only. A structurally valid file can still teach
 *     something poorly; these checks never reject content.
 */
export function validateBatch(raw: unknown, file: string, validators: QuestionBatchValidators): BatchValidationResult {
  const issues: ValidationIssue[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    issues.push(
      makeIssue(
        "error",
        "not-a-batch",
        file,
        "top-level value must be a batch object ({ schemaVersion, dataset, batch, answerSectionOrder, questions }), not an array or primitive",
      ),
    );
    return { issues };
  }

  const root = raw as Record<string, unknown>;
  const declaredDifficulty = (root.batch as { difficulty?: unknown } | undefined)?.difficulty;

  if (!isDifficulty(declaredDifficulty)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-difficulty",
        file,
        `batch.difficulty must be one of ${DIFFICULTIES.join(", ")} (found ${JSON.stringify(declaredDifficulty)})`,
        { path: "batch.difficulty" },
      ),
    );
    return { issues };
  }
  const difficulty: Difficulty = declaredDifficulty;

  /* ----------------------------- 1. structural ---------------------------- */

  const schemaResult = validators.validate(difficulty, raw);
  if (!schemaResult.valid) {
    const questions = Array.isArray(root.questions) ? (root.questions as Array<{ id?: unknown }>) : [];
    const seen = new Set<string>();
    for (const error of schemaResult.errors) {
      const formatted = formatSchemaError(error, raw);
      const questionId =
        formatted.questionIndex !== undefined && typeof questions[formatted.questionIndex]?.id === "string"
          ? String(questions[formatted.questionIndex].id)
          : undefined;
      const key = `${formatted.path}|${formatted.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(
        makeIssue("error", "schema", file, formatted.message, { path: formatted.path, questionId }),
      );
    }
    return { issues };
  }

  const envelope = QuestionBatchSchema.safeParse(raw);
  if (!envelope.success) {
    for (const issue of envelope.error.issues) {
      issues.push(makeIssue("error", "batch-meta", file, issue.message, { path: zodPath(issue.path) }));
    }
    return { issues };
  }

  const questions: SourceQuestion[] = [];
  envelope.data.questions.forEach((candidate, index) => {
    const parsed = QuestionSchema.safeParse(candidate);
    if (parsed.success) {
      questions.push(parsed.data);
      return;
    }
    const questionId = (candidate as { id?: string } | null)?.id;
    for (const issue of parsed.error.issues) {
      issues.push(
        makeIssue("error", "answer-shape", file, issue.message, {
          path: `questions[${index}].${zodPath(issue.path)}`,
          questionId: typeof questionId === "string" ? questionId : undefined,
        }),
      );
    }
  });
  if (issues.some((issue) => issue.severity === "error")) return { issues };

  const validated: ValidatedBatch = {
    file,
    dataset: envelope.data.dataset,
    batch: envelope.data.batch,
    answerSectionOrder: envelope.data.answerSectionOrder,
    questions,
  };

  /* ------------------------------ 2. semantic ----------------------------- */
  issues.push(...semanticChecks(validated));
  if (issues.some((issue) => issue.severity === "error")) return { issues };

  /* ------------------------------- 3. quality ----------------------------- */
  issues.push(...qualityChecks(validated));

  return { batch: validated, issues };
}

/* -------------------------------------------------------------------------- */

function semanticChecks({ file, batch, answerSectionOrder, questions }: ValidatedBatch): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (code: string, message: string, extras?: IssueExtras) =>
    issues.push(makeIssue("error", code, file, message, extras));
  const warn = (code: string, message: string, extras?: IssueExtras) =>
    issues.push(makeIssue("warning", code, file, message, extras));

  // Folder must agree with the batch difficulty (data/questions/<difficulty>/...).
  const [folder] = file.split("/");
  if (file.includes("/") && isDifficulty(folder) && folder !== batch.difficulty) {
    error(
      "folder-difficulty-mismatch",
      `file is in "${folder}/" but batch.difficulty is "${batch.difficulty}"`,
      { path: "batch.difficulty" },
    );
  } else if (file.includes("/") && !isDifficulty(folder)) {
    warn("unrecognised-folder", `folder "${folder}" is not a difficulty folder (${DIFFICULTIES.join(", ")})`);
  }

  // The 15 sections must appear in the canonical order.
  const expected = ANSWER_SECTION_KEYS as readonly string[];
  const orderMatches = answerSectionOrder.length === expected.length && answerSectionOrder.every((key, i) => key === expected[i]);
  if (!orderMatches) {
    const missing = expected.filter((key) => !answerSectionOrder.includes(key));
    const unexpected = answerSectionOrder.filter((key) => !expected.includes(key));
    const detail = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      unexpected.length ? `unexpected: ${unexpected.join(", ")}` : "",
      !missing.length && !unexpected.length ? "same sections in a different order" : "",
    ]
      .filter(Boolean)
      .join("; ");
    error("section-order", `answerSectionOrder must match the canonical 15-section order (${detail})`, {
      path: "answerSectionOrder",
    });
  }

  // Batch counts and ranges.
  if (batch.questionCount !== questions.length) {
    error(
      "batch-count",
      `batch.questionCount is ${batch.questionCount} but the file contains ${questions.length} question(s)`,
      { path: "batch.questionCount" },
    );
  }
  if (batch.questionRange.end < batch.questionRange.start) {
    error("batch-range", `batch.questionRange.end (${batch.questionRange.end}) is before start (${batch.questionRange.start})`, {
      path: "batch.questionRange",
    });
  }

  const prefix = DIFFICULTY_META[batch.difficulty].idPrefix;
  const target = DIFFICULTY_META[batch.difficulty].target;
  const seenIds = new Set<string>();
  const seenSequences = new Set<number>();

  questions.forEach((question, index) => {
    const at = (field: string) => `questions[${index}].${field}`;
    const extras = (field: string): IssueExtras => ({ questionId: question.id, path: at(field) });

    if (question.difficulty !== batch.difficulty) {
      error("question-difficulty", `question difficulty "${question.difficulty}" differs from batch difficulty "${batch.difficulty}"`, extras("difficulty"));
    }

    if (seenIds.has(question.id)) {
      error("duplicate-id", `duplicate question id ${question.id} inside this file`, extras("id"));
    }
    seenIds.add(question.id);

    if (seenSequences.has(question.sequence)) {
      error("duplicate-sequence", `duplicate sequence ${question.sequence} inside this file`, extras("sequence"));
    }
    seenSequences.add(question.sequence);

    const suffix = /^(.*)-(\d+)$/.exec(question.id);
    if (!suffix || suffix[1] !== prefix || Number(suffix[2]) !== question.sequence) {
      error(
        "id-sequence-mismatch",
        `id ${question.id} must be ${prefix}-<sequence> with the sequence ${question.sequence} zero-padded to three digits`,
        extras("id"),
      );
    }

    if (question.sequence > target) {
      error(
        "sequence-out-of-curriculum",
        `sequence ${question.sequence} exceeds the ${batch.difficulty} curriculum target of ${target}`,
        extras("sequence"),
      );
    }

    if (question.sequence < batch.questionRange.start || question.sequence > batch.questionRange.end) {
      warn(
        "sequence-outside-range",
        `sequence ${question.sequence} is outside the declared batch range ${batch.questionRange.start}-${batch.questionRange.end}`,
        extras("sequence"),
      );
    }

    for (const role of question.roles) {
      if (!(ROLES as readonly string[]).includes(role)) {
        error("unknown-role", `unknown role "${role}"; expected one of ${ROLES.join(", ")}`, extras("roles"));
      }
    }
    for (const industry of question.industries) {
      if (!(INDUSTRIES as readonly string[]).includes(industry)) {
        error("unknown-industry", `unknown industry "${industry}"; expected one of ${INDUSTRIES.join(", ")}`, extras("industries"));
      }
    }
    const exampleIndustry = question.answer.industryExample.industry;
    if (!(INDUSTRIES as readonly string[]).includes(exampleIndustry)) {
      error(
        "unknown-industry",
        `industryExample.industry "${exampleIndustry}" is not one of ${INDUSTRIES.join(", ")}`,
        extras("answer.industryExample.industry"),
      );
    }
  });

  return issues;
}

/* -------------------------------------------------------------------------- */

function qualityChecks({ file, batch, questions }: ValidatedBatch): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  questions.forEach((question, index) => {
    const warn = (code: string, message: string, field: string) =>
      issues.push(
        makeIssue("warning", code, file, message, {
          questionId: question.id,
          path: `questions[${index}].${field}`,
        }),
      );
    const { answer } = question;

    if (answer.endToEndFlow.diagrams.length === 0) {
      warn("missing-diagram", "no Mermaid diagram provided in endToEndFlow.diagrams", "answer.endToEndFlow.diagrams");
    }
    if (answer.endToEndFlow.steps.length === 0) {
      warn("missing-flow-steps", "endToEndFlow.steps is empty", "answer.endToEndFlow.steps");
    }

    const seenDiagramIds = new Set<string>();
    answer.endToEndFlow.diagrams.forEach((diagram, d) => {
      const field = `answer.endToEndFlow.diagrams[${d}]`;
      if (seenDiagramIds.has(diagram.id)) warn("duplicate-diagram-id", `diagram id ${diagram.id} is repeated`, `${field}.id`);
      seenDiagramIds.add(diagram.id);
      if (detectDiagramKind(diagram.mermaid) === null) {
        warn("mermaid-unrecognised", `diagram "${diagram.id}" does not start with a known Mermaid diagram keyword`, `${field}.mermaid`);
      }
      const unsafe = findUnsafeConstruct(diagram.mermaid);
      if (unsafe) {
        warn("mermaid-unsafe", `diagram "${diagram.id}" will not render: ${unsafe}`, `${field}.mermaid`);
      }
    });

    if (answer.codeExample.explanation.length === 0) {
      warn("code-without-explanation", "codeExample has no explanation", "answer.codeExample.explanation");
    }
    if (!isKnownCodeLanguage(answer.codeExample.language)) {
      warn(
        "code-language-unsupported",
        `code language "${answer.codeExample.language}" has no syntax highlighting and will render as plain text`,
        "answer.codeExample.language",
      );
    }
    if (answer.testing.verificationCommand.length === 0) {
      warn("missing-verification-command", "testing.verificationCommand is empty", "answer.testing");
    }

    if (question.learningOutcomes.length === 0) {
      warn("missing-learning-outcomes", "learningOutcomes is empty", "learningOutcomes");
    }

    for (const level of ["beginner", "intermediate", "advanced", "expert"] as const) {
      if (answer.followUps[level].length === 0) {
        warn("empty-followups", `followUps.${level} has no questions`, `answer.followUps.${level}`);
      }
    }

    if (answer.projectExperience.status !== "hypothetical" && answer.projectExperience.status !== "verified") {
      warn(
        "project-status-unknown",
        `projectExperience.status "${answer.projectExperience.status}" is not "hypothetical" or "verified"; it will be shown as unverified`,
        "answer.projectExperience.status",
      );
    }

    const definitionWords = countWords(answer.definition.text);
    if (definitionWords < 7 || definitionWords > 10) {
      warn("definition-length", `definition is ${definitionWords} words; the content standard is 7-10`, "answer.definition.text");
    }
    const characteristicCount = answer.characteristics.length;
    if (characteristicCount < 4 || characteristicCount > 5) {
      warn("characteristic-count", `${characteristicCount} characteristics; expected 4-5`, "answer.characteristics");
    }

    if (!(PRIORITY_ORDER as readonly string[]).includes(question.priority)) {
      warn("unknown-priority", `priority "${question.priority}" is not one of ${PRIORITY_ORDER.join(", ")}; it will sort last`, "priority");
    }
    if (question.tags.length === 0) {
      warn("missing-tags", "no tags provided; search will rely on title and topic only", "tags");
    }
  });

  if (batch.questionRange.end - batch.questionRange.start + 1 !== batch.questionCount) {
    issues.push(
      makeIssue(
        "warning",
        "range-count-mismatch",
        file,
        `batch range ${batch.questionRange.start}-${batch.questionRange.end} spans ${
          batch.questionRange.end - batch.questionRange.start + 1
        } question(s) but questionCount is ${batch.questionCount}`,
        { path: "batch.questionRange" },
      ),
    );
  }
  if (batch.questionRange.end > CURRICULUM_TARGET) {
    issues.push(
      makeIssue("warning", "range-beyond-target", file, `batch range ends at ${batch.questionRange.end}, beyond the ${CURRICULUM_TARGET}-question curriculum`, {
        path: "batch.questionRange",
      }),
    );
  }

  return issues;
}
