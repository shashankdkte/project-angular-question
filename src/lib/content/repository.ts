import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Project } from "../schemas/project";
import type { ContentIndex, ContentReport, QuestionRecord, QuestionSummary } from "../../types/content";
import { resolveContentPaths } from "./paths";

/**
 * Data-access boundary for question content.
 *
 * Pages and components depend ONLY on this interface. Version 1 implements it
 * on top of the build-generated files in `generated/`; a later version can
 * swap in an API, database or CMS implementation without touching any UI.
 */
export interface ContentRepository {
  getIndex(): Promise<ContentIndex>;
  getQuestion(id: string): Promise<QuestionRecord | null>;
  getNeighbors(id: string): Promise<QuestionNeighbors | null>;
  getProjects(): Promise<Project[]>;
  getReport(): Promise<ContentReport | null>;
}

export interface QuestionNeighbors {
  previous: QuestionSummary | null;
  next: QuestionSummary | null;
  /** 1-based position within all loaded questions, in curriculum order. */
  position: number;
  total: number;
}

const paths = resolveContentPaths();
const isProduction = process.env.NODE_ENV === "production";

/** In production the files never change under a running server; in dev we re-read when mtime changes. */
const fileCache = new Map<string, { mtimeMs: number; value: unknown }>();

async function readJson<T>(file: string): Promise<T> {
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    throw new ContentNotBuiltError(file);
  }
  const cached = fileCache.get(file);
  if (cached && (isProduction || cached.mtimeMs === stat.mtimeMs)) return cached.value as T;
  const value = JSON.parse(await fs.readFile(file, "utf8")) as T;
  fileCache.set(file, { mtimeMs: stat.mtimeMs, value });
  return value;
}

export class ContentNotBuiltError extends Error {
  constructor(file: string) {
    super(
      `Content artifact not found: ${path.relative(paths.root, file)}. ` +
        "Run `npm run content:build` to generate it from data/questions.",
    );
    this.name = "ContentNotBuiltError";
  }
}

const QUESTION_ID = /^[A-Z]{3}-[A-Z]{3}-\d{3,}$/;

const fileRepository: ContentRepository = {
  getIndex: cache(() => readJson<ContentIndex>(path.join(paths.generatedDir, "index.json"))),

  async getQuestion(id) {
    // Guard against path traversal: ids are only ever `ANG-XXX-000`-shaped.
    if (!QUESTION_ID.test(id)) return null;
    try {
      return await readJson<QuestionRecord>(path.join(paths.generatedQuestionsDir, `${id}.json`));
    } catch (error) {
      if (error instanceof ContentNotBuiltError) return null;
      throw error;
    }
  },

  async getNeighbors(id) {
    const { questions } = await fileRepository.getIndex();
    const position = questions.findIndex((question) => question.id === id);
    if (position === -1) return null;
    return {
      previous: questions[position - 1] ?? null,
      next: questions[position + 1] ?? null,
      position: position + 1,
      total: questions.length,
    };
  },

  async getProjects() {
    try {
      return await readJson<Project[]>(path.join(paths.generatedDir, "projects.json"));
    } catch (error) {
      if (error instanceof ContentNotBuiltError) return [];
      throw error;
    }
  },

  async getReport() {
    try {
      return await readJson<ContentReport>(path.join(paths.generatedDir, "report.json"));
    } catch (error) {
      if (error instanceof ContentNotBuiltError) return null;
      throw error;
    }
  },
};

export const contentRepository: ContentRepository = fileRepository;
