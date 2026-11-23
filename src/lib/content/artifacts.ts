import { promises as fs } from "node:fs";
import path from "node:path";
import type { ContentPaths } from "./paths";
import type { IngestResult } from "./ingest";

/** Write via temp file + rename so readers (the dev server) never see a half-written file. */
async function writeFileAtomic(file: string, contents: string): Promise<void> {
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, contents, "utf8");
  try {
    await fs.rename(temp, file);
  } catch {
    // Windows can refuse to replace a file that is momentarily open; fall back to a direct write.
    await fs.writeFile(file, contents, "utf8");
    await fs.rm(temp, { force: true });
  }
}

export async function writeArtifacts(result: IngestResult, paths: ContentPaths): Promise<void> {
  await fs.mkdir(paths.generatedQuestionsDir, { recursive: true });
  await fs.mkdir(paths.publicContentDir, { recursive: true });

  // Per-question records (loaded on demand by the question page).
  const expected = new Set<string>();
  for (const record of result.records) {
    const name = `${record.id}.json`;
    expected.add(name);
    await writeFileAtomic(path.join(paths.generatedQuestionsDir, name), JSON.stringify(record));
  }
  // Remove records for questions that no longer exist in the source data.
  for (const existing of await fs.readdir(paths.generatedQuestionsDir)) {
    if (existing.endsWith(".json") && !expected.has(existing)) {
      await fs.rm(path.join(paths.generatedQuestionsDir, existing), { force: true });
    }
  }

  const indexJson = JSON.stringify(result.index);
  await writeFileAtomic(path.join(paths.generatedDir, "index.json"), indexJson);
  await writeFileAtomic(path.join(paths.generatedDir, "projects.json"), JSON.stringify(result.projects));
  await writeFileAtomic(path.join(paths.generatedDir, "report.json"), JSON.stringify(result.report, null, 2));

  // Static copy for browser-side consumers (command palette search).
  await writeFileAtomic(path.join(paths.publicContentDir, "index.json"), indexJson);
}
