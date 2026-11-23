/** Small text utilities shared by validation, normalisation and reading-time estimates. */

/** Flatten every string found anywhere inside a JSON value. */
export function collectText(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectText(item, out);
  } else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) collectText(item, out);
  }
  return out;
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function countLines(text: string): number {
  return text.length === 0 ? 0 : text.replace(/\n$/, "").split("\n").length;
}

const PROSE_WORDS_PER_MINUTE = 220;
const SECONDS_PER_CODE_LINE = 4;

/**
 * Reading effort for one answer section in seconds. Prose is read at
 * ~220 wpm; code is read much more slowly (~4 s per line).
 */
export function estimateSectionSeconds(key: string, section: unknown): number {
  if (key === "codeExample" && typeof section === "object" && section !== null) {
    const { code, ...rest } = section as { code?: unknown } & Record<string, unknown>;
    const lines = typeof code === "string" ? countLines(code) : 0;
    const proseWords = collectText(rest).reduce((sum, text) => sum + countWords(text), 0);
    return Math.round((proseWords / PROSE_WORDS_PER_MINUTE) * 60 + lines * SECONDS_PER_CODE_LINE);
  }
  const words = collectText(section).reduce((sum, text) => sum + countWords(text), 0);
  return Math.round((words / PROSE_WORDS_PER_MINUTE) * 60);
}

export function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

/** All question identifiers mentioned in free text, e.g. "ANG-BEG-004". */
export function findQuestionReferences(text: string): string[] {
  return text.match(/\bANG-[A-Z]{3}-\d{3}\b/g) ?? [];
}
