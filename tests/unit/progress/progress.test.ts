// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { parseProgressExport, serializeProgress } from "../../../src/lib/progress/export-import";
import { mergeProgress, migrateProgress } from "../../../src/lib/progress/migrate";
import { computeProgress, pickContinueQuestion } from "../../../src/lib/progress/stats";
import { useProgressStore } from "../../../src/lib/progress/store";
import { MAX_RECENT, PROGRESS_STORAGE_KEY, PROGRESS_VERSION, emptyProgress, type ProgressData } from "../../../src/lib/progress/types";
import { makeSummaries } from "../../helpers/summaries";

const questions = makeSummaries();

async function freshStore() {
  localStorage.clear();
  useProgressStore.setState({ ...emptyProgress(), hydrated: false });
}

function persisted() {
  const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: ProgressData; version: number }) : null;
}

describe("progress store", () => {
  beforeEach(freshStore);

  it("never marks a question completed just because it was viewed", () => {
    useProgressStore.getState().markViewed("ANG-BEG-001");
    const entry = useProgressStore.getState().questions["ANG-BEG-001"];
    expect(entry.status).toBe("not-started");
    expect(entry.completedAt).toBeUndefined();
    expect(useProgressStore.getState().recent).toEqual(["ANG-BEG-001"]);
    expect(computeProgress(questions, useProgressStore.getState().questions).mastered).toBe(0);
  });

  it("records status changes, and clears completedAt when leaving mastered", () => {
    const { setStatus } = useProgressStore.getState();
    setStatus("ANG-BEG-001", "mastered");
    expect(useProgressStore.getState().questions["ANG-BEG-001"].completedAt).toBeTypeOf("number");
    setStatus("ANG-BEG-001", "practicing");
    expect(useProgressStore.getState().questions["ANG-BEG-001"].completedAt).toBeUndefined();
  });

  it("toggles bookmark and revision independently of status", () => {
    const { toggleBookmark, toggleRevision } = useProgressStore.getState();
    toggleBookmark("ANG-BEG-002");
    toggleRevision("ANG-BEG-002");
    expect(useProgressStore.getState().questions["ANG-BEG-002"]).toMatchObject({ bookmarked: true, revision: true, status: "not-started" });
    toggleBookmark("ANG-BEG-002");
    expect(useProgressStore.getState().questions["ANG-BEG-002"].bookmarked).toBe(false);
  });

  it("keeps a bounded, de-duplicated, most-recent-first history", () => {
    const { markViewed } = useProgressStore.getState();
    for (let i = 0; i < MAX_RECENT + 10; i += 1) markViewed(`ANG-BEG-${String(i + 1).padStart(3, "0")}`);
    markViewed("ANG-BEG-020");
    const { recent } = useProgressStore.getState();
    expect(recent).toHaveLength(MAX_RECENT);
    expect(recent[0]).toBe("ANG-BEG-020");
    expect(new Set(recent).size).toBe(recent.length);
  });

  it("persists to LocalStorage under a versioned key, keyed by question id", () => {
    useProgressStore.getState().setStatus("ANG-BEG-001", "learning");
    useProgressStore.getState().setNotes("ANG-BEG-001", "remember TDZ");
    const stored = persisted();
    expect(stored?.version).toBe(PROGRESS_VERSION);
    expect(stored?.state.questions["ANG-BEG-001"]).toMatchObject({ status: "learning", notes: "remember TDZ" });
  });

  it("restores saved progress on rehydrate and then reports hydrated", async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: PROGRESS_VERSION,
        state: {
          questions: { "ANG-BEG-001": { status: "mastered", bookmarked: true, revision: false, notes: "kept", updatedAt: 5 } },
          recent: ["ANG-BEG-001"],
        },
      }),
    );
    expect(useProgressStore.getState().hydrated).toBe(false);
    await useProgressStore.persist.rehydrate();
    const state = useProgressStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.questions["ANG-BEG-001"]).toMatchObject({ status: "mastered", bookmarked: true, notes: "kept" });
    expect(state.recent).toEqual(["ANG-BEG-001"]);
  });

  it("survives corrupted stored entries without crashing (sanitised on load)", async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: PROGRESS_VERSION,
        state: { questions: { "ANG-BEG-001": { status: "bogus-status", notes: 12 } }, recent: "not-an-array" },
      }),
    );
    await useProgressStore.persist.rehydrate();
    const state = useProgressStore.getState();
    expect(state.hydrated).toBe(true);
    expect(["not-started", "learning", "practicing", "mastered"]).toContain(state.questions["ANG-BEG-001"]?.status ?? "not-started");
    expect(Array.isArray(state.recent)).toBe(true);
  });

  it("keeps a backup copy when stored data is from an unknown future version", async () => {
    const raw = JSON.stringify({ version: PROGRESS_VERSION + 5, state: { questions: {}, recent: [] } });
    localStorage.setItem(PROGRESS_STORAGE_KEY, raw);
    await useProgressStore.persist.rehydrate();
    const backups = Object.keys(localStorage).filter((key) => key.startsWith(`${PROGRESS_STORAGE_KEY}:backup:`));
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0])).toBe(raw);
  });
});

describe("migration", () => {
  it("accepts current-version data", () => {
    const result = migrateProgress({ questions: {}, recent: [] }, PROGRESS_VERSION);
    expect(result.ok).toBe(true);
  });

  it("rejects data from a newer version instead of guessing", () => {
    const result = migrateProgress({ questions: {}, recent: [] }, PROGRESS_VERSION + 1);
    expect(result).toMatchObject({ ok: false, reason: "future-version" });
  });

  it("rejects an invalid version number", () => {
    expect(migrateProgress({}, -1)).toMatchObject({ ok: false });
    expect(migrateProgress({}, 1.5)).toMatchObject({ ok: false });
  });

  it("rejects payloads that are not objects", () => {
    expect(migrateProgress("nope", PROGRESS_VERSION)).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("export / import", () => {
  const sample: ProgressData = {
    questions: { "ANG-BEG-001": { status: "mastered", bookmarked: true, revision: false, notes: "n", updatedAt: 10, completedAt: 10 } },
    recent: ["ANG-BEG-001"],
  };

  it("round-trips through the versioned envelope", () => {
    const text = serializeProgress(sample, new Date("2026-01-02T03:04:05Z"));
    const envelope = JSON.parse(text);
    expect(envelope).toMatchObject({ app: "angular-mastery", kind: "progress", version: PROGRESS_VERSION, exportedAt: "2026-01-02T03:04:05.000Z" });
    const parsed = parseProgressExport(text);
    expect(parsed).toMatchObject({ ok: true });
    if (parsed.ok) expect(parsed.data.questions["ANG-BEG-001"]).toMatchObject({ status: "mastered", bookmarked: true });
  });

  it("gives readable errors for bad files", () => {
    expect(parseProgressExport("{ nope")).toEqual({ ok: false, error: "The file is not valid JSON." });
    expect(parseProgressExport(JSON.stringify({ hello: "world" }))).toMatchObject({ ok: false, error: expect.stringContaining("does not look like") });
    const future = JSON.stringify({ app: "angular-mastery", kind: "progress", version: 99, exportedAt: "x", data: { questions: {}, recent: [] } });
    expect(parseProgressExport(future)).toMatchObject({ ok: false, error: expect.stringContaining("newer version") });
  });

  it("merges by newest update per question", () => {
    const base: ProgressData = {
      questions: {
        a: { status: "learning", bookmarked: false, revision: false, notes: "", updatedAt: 100 },
        b: { status: "learning", bookmarked: false, revision: false, notes: "", updatedAt: 100 },
      },
      recent: ["a"],
    };
    const incoming: ProgressData = {
      questions: {
        a: { status: "mastered", bookmarked: false, revision: false, notes: "", updatedAt: 200 },
        b: { status: "mastered", bookmarked: false, revision: false, notes: "", updatedAt: 50 },
        c: { status: "practicing", bookmarked: false, revision: false, notes: "", updatedAt: 1 },
      },
      recent: ["c"],
    };
    const merged = mergeProgress(base, incoming);
    expect(merged.questions.a.status).toBe("mastered");
    expect(merged.questions.b.status).toBe("learning");
    expect(merged.questions.c.status).toBe("practicing");
    expect(merged.recent).toEqual(["c", "a"]);
  });
});

describe("progress statistics", () => {
  it("is all zeros with no progress, and completion is 0% (not NaN)", () => {
    const summary = computeProgress(questions, {});
    expect(summary).toMatchObject({ target: 600, loaded: 3, mastered: 0, bookmarked: 0, percentOfLoaded: 0 });
    expect(computeProgress([], {}).percentOfLoaded).toBe(0);
  });

  it("derives every figure from the data", () => {
    const summary = computeProgress(questions, {
      "ANG-BEG-001": { status: "mastered", bookmarked: true, revision: false, notes: "", updatedAt: 1 },
      "ANG-INT-001": { status: "learning", bookmarked: true, revision: true, notes: "", updatedAt: 1 },
      "ANG-GONE-999": { status: "mastered", bookmarked: true, revision: true, notes: "", updatedAt: 1 },
    });
    expect(summary.mastered).toBe(1);
    expect(summary.percentOfLoaded).toBe(33);
    expect(summary.bookmarked).toBe(2); // the unloaded id is ignored
    expect(summary.byStatus).toMatchObject({ mastered: 1, learning: 1, "not-started": 1 });
  });

  it("always lists all four difficulty levels with fixed targets", () => {
    const summary = computeProgress(questions, {});
    expect(summary.byDifficulty.map((g) => [g.key, g.loaded, g.target])).toEqual([
      ["beginner", 2, 135],
      ["intermediate", 1, 165],
      ["advanced", 0, 165],
      ["expert", 0, 135],
    ]);
  });

  it("groups by industry, domain and topic from the loaded questions", () => {
    const summary = computeProgress(questions, {});
    expect(summary.byIndustry.map((g) => g.key)).toEqual(["banking", "ecommerce", "healthcare", "saas"]);
    expect(summary.byDomain.map((g) => g.label)).toEqual(["Angular Core", "JavaScript Fundamentals"]);
    expect(summary.byTopic).toHaveLength(3);
  });

  it("picks Continue Learning from recents, skipping mastered questions", () => {
    const progress: ProgressData = {
      questions: { "ANG-BEG-002": { status: "mastered", bookmarked: false, revision: false, notes: "", updatedAt: 1 } },
      recent: ["ANG-BEG-002", "ANG-INT-001"],
    };
    expect(pickContinueQuestion(questions, progress)?.id).toBe("ANG-INT-001");
  });

  it("falls back to the first unmastered question, and to null when everything is mastered", () => {
    expect(pickContinueQuestion(questions, emptyProgress())?.id).toBe("ANG-BEG-001");
    const all: ProgressData = {
      questions: Object.fromEntries(questions.map((q) => [q.id, { status: "mastered", bookmarked: false, revision: false, notes: "", updatedAt: 1 }])) as never,
      recent: [],
    };
    expect(pickContinueQuestion(questions, all)).toBeNull();
    expect(pickContinueQuestion([], emptyProgress())).toBeNull();
  });
});
