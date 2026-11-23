import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ingestContent, type IngestResult } from "../../src/lib/content/ingest";
import { resolveContentPaths, type ContentPaths } from "../../src/lib/content/paths";

const ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA = path.join(ROOT, "schemas", "question_batch_schema_v1.json");
const FIXTURE = path.join(ROOT, "tests", "fixtures", "beginner_01_questions_001_005.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export async function loadRealBatch(): Promise<Json> {
  return JSON.parse(await fs.readFile(FIXTURE, "utf8"));
}

export async function clone<T>(value: T): Promise<T> {
  return structuredClone(value);
}

export interface TestWorkspace {
  paths: ContentPaths;
  write(relativePath: string, content: unknown): Promise<void>;
  writeProject(relativePath: string, content: unknown): Promise<void>;
  ingest(): Promise<IngestResult>;
  dispose(): Promise<void>;
}

/** An isolated data/ + schemas/ directory under the OS temp dir. */
export async function createWorkspace(): Promise<TestWorkspace> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "angular-mastery-"));
  const paths = resolveContentPaths(root);
  await fs.mkdir(path.dirname(paths.schemaPath), { recursive: true });
  await fs.copyFile(SCHEMA, paths.schemaPath);
  await fs.mkdir(paths.questionsDir, { recursive: true });

  const writeJson = async (base: string, relativePath: string, content: unknown) => {
    const target = path.join(base, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  };

  return {
    paths,
    write: (relativePath, content) => writeJson(paths.questionsDir, relativePath, content),
    writeProject: (relativePath, content) => writeJson(paths.projectsDir, relativePath, content),
    ingest: () => ingestContent(paths),
    dispose: () => fs.rm(root, { recursive: true, force: true }),
  };
}

/** Build a one-question batch derived from a real question, for extensibility tests. */
export async function makeBatch(opts: {
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert";
  prefix?: string;
  sequences: number[];
  batchId?: string;
  rangeStart?: number;
  rangeEnd?: number;
}): Promise<Json> {
  const real = await loadRealBatch();
  const difficulty = opts.difficulty ?? "beginner";
  const prefix = opts.prefix ?? { beginner: "ANG-BEG", intermediate: "ANG-INT", advanced: "ANG-ADV", expert: "ANG-EXP" }[difficulty];
  const template = real.questions[0];
  const questions = opts.sequences.map((sequence) => {
    const question = structuredClone(template);
    question.id = `${prefix}-${String(sequence).padStart(3, "0")}`;
    question.sequence = sequence;
    question.difficulty = difficulty;
    question.topic = `Synthetic test topic ${sequence}`;
    question.question = `Synthetic test question ${sequence}?`;
    question.answer.endToEndFlow.diagrams[0].id = `${question.id}-flow`;
    return question;
  });
  return {
    ...structuredClone(real),
    batch: {
      id: opts.batchId ?? `${difficulty}-test-${opts.sequences[0]}`,
      difficulty,
      questionRange: { start: opts.rangeStart ?? opts.sequences[0], end: opts.rangeEnd ?? opts.sequences[opts.sequences.length - 1] },
      questionCount: questions.length,
      curriculumVersion: real.batch.curriculumVersion,
    },
    questions,
  };
}
