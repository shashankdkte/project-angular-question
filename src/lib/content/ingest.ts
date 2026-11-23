import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import {
  DIFFICULTY_ORDER,
  type Difficulty,
} from "../curriculum";
import { ProjectFileSchema, type Project } from "../schemas/project";
import type {
  BatchSummary,
  ContentIndex,
  ContentReport,
  FileReport,
  QuestionRecord,
  QuestionSummary,
  ValidationIssue,
} from "../../types/content";
import { createBatchValidators } from "./schema-validators";
import { validateBatch, type ValidatedBatch } from "./validate-batch";
import { collectText, estimateSectionSeconds, findQuestionReferences, secondsToMinutes } from "./text";

export interface IngestOptions {
  /** Absolute path of data/questions. */
  questionsDir: string;
  /** Absolute path of the canonical JSON Schema file. */
  schemaPath: string;
  /** Absolute path of data/projects (optional; missing directory means no projects). */
  projectsDir?: string;
}

export interface IngestResult {
  index: ContentIndex;
  records: QuestionRecord[];
  projects: Project[];
  report: ContentReport;
}

const toPosix = (value: string) => value.split(path.sep).join("/");

async function discoverJson(dir: string): Promise<string[]> {
  try {
    await fs.access(dir);
  } catch {
    return [];
  }
  const files = await fg("**/*.json", { cwd: dir, onlyFiles: true, dot: false });
  return files.map(toPosix).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

export async function ingestContent(options: IngestOptions): Promise<IngestResult> {
  const issues: ValidationIssue[] = [];
  const fileReports: FileReport[] = [];

  /* ---- canonical schema ---------------------------------------------------- */
  let baseSchema: Record<string, unknown>;
  try {
    baseSchema = JSON.parse(await fs.readFile(options.schemaPath, "utf8")) as Record<string, unknown>;
  } catch (cause) {
    throw new Error(
      `Cannot load the canonical schema at ${options.schemaPath}: ${(cause as Error).message}. ` +
        "Place question_batch_schema_v1.json in the schemas/ directory.",
    );
  }
  const validators = createBatchValidators(baseSchema);

  /* ---- 1. discover + per-file validation ----------------------------------- */
  const files = await discoverJson(options.questionsDir);
  const accepted: ValidatedBatch[] = [];

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(path.join(options.questionsDir, file), "utf8"));
    } catch (cause) {
      issues.push({
        severity: "error",
        code: "json-parse",
        file,
        message: `invalid JSON: ${(cause as Error).message}`,
      });
      fileReports.push({ file, accepted: false, questionCount: 0 });
      continue;
    }

    const result = validateBatch(raw, file, validators);
    issues.push(...result.issues);
    if (result.batch) {
      accepted.push(result.batch);
    } else {
      const count = Array.isArray((raw as { questions?: unknown })?.questions)
        ? (raw as { questions: unknown[] }).questions.length
        : 0;
      fileReports.push({ file, accepted: false, questionCount: count });
    }
  }

  /* ---- 2. cross-file checks ------------------------------------------------ */
  const kept = crossFileChecks(accepted, issues);
  for (const batch of kept) {
    fileReports.push({ file: batch.file, accepted: true, batchId: batch.batch.id, questionCount: batch.questions.length });
  }
  for (const batch of accepted) {
    if (!kept.includes(batch)) {
      fileReports.push({ file: batch.file, accepted: false, batchId: batch.batch.id, questionCount: batch.questions.length });
    }
  }

  /* ---- 3. normalise ---------------------------------------------------------- */
  const records: QuestionRecord[] = [];
  const summaries: QuestionSummary[] = [];
  const batches: BatchSummary[] = [];

  for (const validated of kept) {
    batches.push({
      id: validated.batch.id,
      difficulty: validated.batch.difficulty,
      questionRange: validated.batch.questionRange,
      questionCount: validated.batch.questionCount,
      curriculumVersion: validated.batch.curriculumVersion,
      sourceFile: validated.file,
    });
    for (const question of validated.questions) {
      const sectionSeconds: Record<string, number> = {};
      for (const key of validated.answerSectionOrder) {
        sectionSeconds[key] = estimateSectionSeconds(key, (question.answer as Record<string, unknown>)[key]);
      }
      const totalSeconds = Object.values(sectionSeconds).reduce((a, b) => a + b, 0);

      records.push({
        id: question.id,
        sequence: question.sequence,
        difficulty: question.difficulty,
        domain: question.domain,
        topic: question.topic,
        question: question.question,
        questionType: question.questionType,
        priority: question.priority,
        roles: question.roles,
        industries: question.industries,
        tags: question.tags,
        batchId: validated.batch.id,
        answer: question.answer,
        learningOutcomes: question.learningOutcomes,
        sourceNotes: question.sourceNotes,
        answerSectionOrder: validated.answerSectionOrder,
        batch: validated.batch,
        sourceFile: validated.file,
        sectionSeconds,
      });
      summaries.push({
        id: question.id,
        sequence: question.sequence,
        difficulty: question.difficulty,
        domain: question.domain,
        topic: question.topic,
        question: question.question,
        questionType: question.questionType,
        priority: question.priority,
        roles: question.roles,
        industries: question.industries,
        tags: question.tags,
        exampleIndustry: question.answer.industryExample.industry,
        batchId: validated.batch.id,
        readingMinutes: secondsToMinutes(totalSeconds),
        diagramCount: question.answer.endToEndFlow.diagrams.length,
      });
    }
  }

  const byCurriculum = (a: { difficulty: Difficulty; sequence: number }, b: { difficulty: Difficulty; sequence: number }) =>
    DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.sequence - b.sequence;
  records.sort(byCurriculum);
  summaries.sort(byCurriculum);
  batches.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.questionRange.start - b.questionRange.start);

  /* ---- 4. internal references (quality) ----------------------------------- */
  const knownIds = new Set(summaries.map((s) => s.id));
  for (const record of records) {
    const referenced = new Set(findQuestionReferences(collectText(record.answer).join("\n")));
    for (const reference of referenced) {
      if (reference !== record.id && !knownIds.has(reference)) {
        issues.push({
          severity: "warning",
          code: "unresolved-reference",
          file: record.sourceFile,
          questionId: record.id,
          message: `references ${reference}, which is not in the loaded dataset (it may belong to a batch that has not been added yet)`,
        });
      }
    }
  }

  /* ---- 5. projects ----------------------------------------------------------- */
  const projects = await ingestProjects(options.projectsDir, knownIds, issues);

  /* ---- 6. report ------------------------------------------------------------- */
  const datasets = [...new Set(kept.map((b) => b.dataset))];
  const index: ContentIndex = {
    indexVersion: 1,
    generatedAt: new Date().toISOString(),
    dataset: datasets[0] ?? null,
    total: summaries.length,
    questions: summaries,
    batches,
  };

  fileReports.sort((a, b) => a.file.localeCompare(b.file, "en", { numeric: true }));
  const errors = issues.filter((i) => i.severity === "error").length;
  const report: ContentReport = {
    generatedAt: index.generatedAt,
    filesDiscovered: files.length,
    filesAccepted: fileReports.filter((f) => f.accepted).length,
    filesRejected: fileReports.filter((f) => !f.accepted).length,
    questionsAccepted: summaries.length,
    errors,
    warnings: issues.length - errors,
    files: fileReports,
    issues,
  };

  return { index, records, projects, report };
}

/**
 * Dataset-wide rules. Files are processed in sorted path order; the first file
 * to claim an id / sequence / batch id wins and later conflicting files are
 * rejected whole (a batch is accepted or rejected atomically).
 */
function crossFileChecks(batches: ValidatedBatch[], issues: ValidationIssue[]): ValidatedBatch[] {
  const kept: ValidatedBatch[] = [];
  const claimedIds = new Map<string, string>();
  const claimedSequences = new Map<string, { file: string; id: string }>();
  const claimedBatchIds = new Map<string, string>();
  let dataset: string | undefined;
  let curriculumVersion: string | undefined;

  for (const batch of batches) {
    const conflicts: ValidationIssue[] = [];
    const conflict = (code: string, message: string, questionId?: string, pathHint?: string) =>
      conflicts.push({ severity: "error", code, file: batch.file, message, questionId, path: pathHint });

    if (dataset === undefined) dataset = batch.dataset;
    else if (batch.dataset !== dataset) {
      conflict("dataset-mismatch", `dataset "${batch.dataset}" differs from "${dataset}" used by earlier batches`, undefined, "dataset");
    }

    const firstBatchFile = claimedBatchIds.get(batch.batch.id);
    if (firstBatchFile) {
      conflict("duplicate-batch-id", `batch id "${batch.batch.id}" is already used by ${firstBatchFile}`, undefined, "batch.id");
    }

    batch.questions.forEach((question, index) => {
      const firstIdFile = claimedIds.get(question.id);
      if (firstIdFile) {
        conflict("duplicate-id", `question id ${question.id} is already defined in ${firstIdFile}`, question.id, `questions[${index}].id`);
      }
      const sequenceKey = `${question.difficulty}:${question.sequence}`;
      const firstSequence = claimedSequences.get(sequenceKey);
      if (firstSequence && !firstIdFile) {
        conflict(
          "duplicate-sequence",
          `${question.difficulty} sequence ${question.sequence} is already used by ${firstSequence.id} in ${firstSequence.file}`,
          question.id,
          `questions[${index}].sequence`,
        );
      }
    });

    if (conflicts.length > 0) {
      issues.push(...conflicts);
      continue;
    }

    if (curriculumVersion === undefined) curriculumVersion = batch.batch.curriculumVersion;
    else if (batch.batch.curriculumVersion !== curriculumVersion) {
      issues.push({
        severity: "warning",
        code: "curriculum-version-mismatch",
        file: batch.file,
        message: `curriculumVersion "${batch.batch.curriculumVersion}" differs from "${curriculumVersion}" used by earlier batches`,
        path: "batch.curriculumVersion",
      });
    }

    claimedBatchIds.set(batch.batch.id, batch.file);
    for (const question of batch.questions) {
      claimedIds.set(question.id, batch.file);
      claimedSequences.set(`${question.difficulty}:${question.sequence}`, { file: batch.file, id: question.id });
    }
    kept.push(batch);
  }

  return kept;
}

async function ingestProjects(
  projectsDir: string | undefined,
  knownQuestionIds: Set<string>,
  issues: ValidationIssue[],
): Promise<Project[]> {
  if (!projectsDir) return [];
  const files = await discoverJson(projectsDir);
  const projects: Project[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    const label = `projects/${file}`;
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(path.join(projectsDir, file), "utf8"));
    } catch (cause) {
      issues.push({ severity: "error", code: "json-parse", file: label, message: `invalid JSON: ${(cause as Error).message}` });
      continue;
    }
    const parsed = ProjectFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          severity: "error",
          code: "project-schema",
          file: label,
          message: issue.message,
          path: issue.path.map(String).join("."),
        });
      }
      continue;
    }
    for (const project of parsed.data.projects) {
      const earlier = seen.get(project.id);
      if (earlier) {
        issues.push({ severity: "error", code: "duplicate-project-id", file: label, message: `project id "${project.id}" is already defined in ${earlier}` });
        continue;
      }
      seen.set(project.id, label);
      for (const questionId of project.relatedQuestionIds) {
        if (!knownQuestionIds.has(questionId)) {
          issues.push({
            severity: "warning",
            code: "project-unresolved-question",
            file: label,
            message: `project "${project.id}" references ${questionId}, which is not in the loaded dataset`,
          });
        }
      }
      projects.push(project);
    }
  }
  return projects;
}
