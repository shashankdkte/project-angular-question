"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LearningStatus } from "../curriculum";
import { mergeProgress, migrateProgress } from "./migrate";
import {
  MAX_RECENT,
  PROGRESS_STORAGE_KEY,
  PROGRESS_VERSION,
  ProgressDataSchema,
  emptyProgress,
  emptyQuestionProgress,
  type ProgressData,
  type QuestionProgress,
} from "./types";

interface ProgressActions {
  setStatus(id: string, status: LearningStatus): void;
  toggleBookmark(id: string): void;
  toggleRevision(id: string): void;
  setNotes(id: string, notes: string): void;
  /** Records that a question page was opened. Never changes the learning status. */
  markViewed(id: string): void;
  /** Replace everything (used by import with "replace"). */
  replaceAll(data: ProgressData): void;
  /** Merge an import into existing progress (newest entry per question wins). */
  mergeIn(data: ProgressData): void;
  reset(): void;
}

export type ProgressStore = ProgressData & ProgressActions & { hydrated: boolean };

function patch(
  state: ProgressData,
  id: string,
  change: (current: QuestionProgress, now: number) => Partial<QuestionProgress>,
): Pick<ProgressData, "questions"> {
  const now = Date.now();
  const current = state.questions[id] ?? emptyQuestionProgress(now);
  return { questions: { ...state.questions, [id]: { ...current, ...change(current, now), updatedAt: now } } };
}

/** If stored data cannot be understood, keep a backup instead of silently destroying it. */
function backupUnreadable(reason: string) {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) localStorage.setItem(`${PROGRESS_STORAGE_KEY}:backup:${Date.now()}`, raw);
    console.warn(`[progress] stored progress could not be read (${reason}); a backup copy was kept.`);
  } catch {
    /* storage unavailable: nothing to preserve */
  }
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      ...emptyProgress(),
      hydrated: false,

      setStatus: (id, status) =>
        set((state) =>
          patch(state, id, (_current, now) => ({
            status,
            completedAt: status === "mastered" ? now : undefined,
          })),
        ),
      toggleBookmark: (id) => set((state) => patch(state, id, (current) => ({ bookmarked: !current.bookmarked }))),
      toggleRevision: (id) => set((state) => patch(state, id, (current) => ({ revision: !current.revision }))),
      setNotes: (id, notes) => set((state) => patch(state, id, () => ({ notes }))),
      markViewed: (id) =>
        set((state) => {
          const now = Date.now();
          const current = state.questions[id] ?? emptyQuestionProgress(now);
          return {
            questions: { ...state.questions, [id]: { ...current, lastViewedAt: now } },
            recent: [id, ...state.recent.filter((existing) => existing !== id)].slice(0, MAX_RECENT),
          };
        }),
      replaceAll: (data) => set({ questions: data.questions, recent: data.recent }),
      mergeIn: (data) =>
        set((state) => mergeProgress({ questions: state.questions, recent: state.recent }, data)),
      reset: () => set({ ...emptyProgress() }),
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Hydration is triggered explicitly after mount (see StoreHydrator) so SSR and the
      // first client render always agree.
      skipHydration: true,
      partialize: (state): ProgressData => ({ questions: state.questions, recent: state.recent }),
      // Even same-version data is sanitised, so hand-edited or corrupted entries cannot crash the UI.
      merge: (persisted, current) => {
        const parsed = ProgressDataSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
      migrate: (persisted, version) => {
        const result = migrateProgress(persisted, version);
        if (result.ok) return result.data;
        backupUnreadable(result.detail);
        return emptyProgress();
      },
      onRehydrateStorage: () => () => {
        useProgressStore.setState({ hydrated: true });
      },
    },
  ),
);
