import { PROGRESS_VERSION, ProgressDataSchema, emptyProgress, type ProgressData } from "./types";

/**
 * Versioned migration strategy
 * ----------------------------
 * `migrations[n]` upgrades persisted data FROM version n TO version n + 1.
 * To change the stored shape:
 *   1. bump PROGRESS_VERSION in types.ts,
 *   2. add `migrations[<previous version>] = (data) => ({ ...upgraded })` here,
 *   3. add a test with a fixture of the previous shape.
 * Migrations run in sequence, so a user several versions behind still upgrades.
 */
type Migration = (data: unknown) => unknown;

export const migrations: Record<number, Migration> = {
  // Example for a future v1 -> v2 change:
  // 1: (data) => ({ ...(data as object), tags: {} }),
};

export type MigrationResult =
  | { ok: true; data: ProgressData }
  | { ok: false; reason: "future-version" | "invalid"; detail: string };

/** Bring any persisted/imported payload up to the current shape and sanitise it. */
export function migrateProgress(payload: unknown, fromVersion: number): MigrationResult {
  if (!Number.isInteger(fromVersion) || fromVersion < 0) {
    return { ok: false, reason: "invalid", detail: `unsupported version ${String(fromVersion)}` };
  }
  if (fromVersion > PROGRESS_VERSION) {
    return {
      ok: false,
      reason: "future-version",
      detail: `data was written by a newer version (v${fromVersion}); this app understands up to v${PROGRESS_VERSION}`,
    };
  }

  let current = payload;
  for (let version = fromVersion; version < PROGRESS_VERSION; version += 1) {
    const step = migrations[version];
    if (!step) {
      return { ok: false, reason: "invalid", detail: `no migration defined from v${version}` };
    }
    current = step(current);
  }

  if (typeof current !== "object" || current === null) {
    return { ok: false, reason: "invalid", detail: "progress data is not an object" };
  }
  const parsed = ProgressDataSchema.safeParse(current);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", detail: parsed.error.issues[0]?.message ?? "invalid progress data" };
  }
  return { ok: true, data: parsed.data };
}

/** Merge two progress datasets; the more recently updated entry wins per question. */
export function mergeProgress(base: ProgressData, incoming: ProgressData): ProgressData {
  const questions = { ...base.questions };
  for (const [id, entry] of Object.entries(incoming.questions)) {
    const existing = questions[id];
    if (!existing || entry.updatedAt >= existing.updatedAt) questions[id] = entry;
  }
  const recent = [...new Set([...incoming.recent, ...base.recent])].slice(0, 25);
  return { questions, recent };
}

export { emptyProgress };
