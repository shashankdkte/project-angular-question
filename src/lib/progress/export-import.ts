import {
  PROGRESS_EXPORT_APP,
  PROGRESS_VERSION,
  ProgressExportSchema,
  type ProgressData,
} from "./types";
import { migrateProgress } from "./migrate";

export interface ProgressExport {
  app: typeof PROGRESS_EXPORT_APP;
  kind: "progress";
  version: number;
  exportedAt: string;
  data: ProgressData;
}

export function serializeProgress(data: ProgressData, now = new Date()): string {
  const payload: ProgressExport = {
    app: PROGRESS_EXPORT_APP,
    kind: "progress",
    version: PROGRESS_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

export type ParseProgressResult = { ok: true; data: ProgressData; version: number } | { ok: false; error: string };

/** Validate and migrate an exported file. Never throws. */
export function parseProgressExport(text: string): ParseProgressResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const envelope = ProgressExportSchema.safeParse(raw);
  if (!envelope.success) {
    return { ok: false, error: "This does not look like an Angular Mastery progress export." };
  }
  const migrated = migrateProgress(envelope.data.data, envelope.data.version);
  if (!migrated.ok) return { ok: false, error: `Cannot import: ${migrated.detail}.` };
  return { ok: true, data: migrated.data, version: envelope.data.version };
}
