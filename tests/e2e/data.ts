import fs from "node:fs";
import path from "node:path";
import { DIFFICULTIES } from "../../src/lib/curriculum";

/**
 * Every question currently in data/questions, read straight from the source files, so e2e expectations
 * follow the real content as batches are added and are never hardcoded to a particular count.
 */
interface RealQuestion {
  id: string;
  sequence: number;
  topic: string;
  question: string;
  priority: string;
  questionType: string;
  difficulty: string;
  answer: {
    definition: { text: string };
    codeExample: { code: string };
    followUps: Record<string, string[]>;
    alternatives: unknown[];
  };
}

const root = path.join(__dirname, "..", "..", "data", "questions");

function jsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsonFiles(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

export const realQuestions: RealQuestion[] = jsonFiles(root)
  .flatMap((file) => (JSON.parse(fs.readFileSync(file, "utf8")).questions ?? []) as RealQuestion[])
  .sort(
    (a, b) =>
      DIFFICULTIES.indexOf(a.difficulty as (typeof DIFFICULTIES)[number]) - DIFFICULTIES.indexOf(b.difficulty as (typeof DIFFICULTIES)[number]) ||
      a.sequence - b.sequence,
  );

export const countBy = <K extends keyof RealQuestion>(key: K, value: RealQuestion[K]) =>
  realQuestions.filter((question) => question[key] === value).length;
