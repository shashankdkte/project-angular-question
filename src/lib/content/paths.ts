import path from "node:path";

export interface ContentPaths {
  root: string;
  questionsDir: string;
  projectsDir: string;
  schemaPath: string;
  /** Build output read by the server (full per-question records, report). */
  generatedDir: string;
  generatedQuestionsDir: string;
  /** Static assets served to the browser (lightweight index only). */
  publicContentDir: string;
}

export function resolveContentPaths(root: string = process.cwd()): ContentPaths {
  const generatedDir = path.join(root, "generated");
  return {
    root,
    questionsDir: path.join(root, "data", "questions"),
    projectsDir: path.join(root, "data", "projects"),
    schemaPath: path.join(root, "schemas", "question_batch_schema_v1.json"),
    generatedDir,
    generatedQuestionsDir: path.join(generatedDir, "questions"),
    publicContentDir: path.join(root, "public", "content"),
  };
}
