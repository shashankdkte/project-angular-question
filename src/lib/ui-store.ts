"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_READING_MODE, isReadingMode, type ReadingMode } from "./curriculum";

/** Presentation preferences only. Never affects content or progress. */
interface UiState {
  readingMode: ReadingMode;
  sidebarOpen: boolean;
  codeLineNumbers: boolean;
  codeWordWrap: boolean;
  hydrated: boolean;
  setReadingMode(mode: ReadingMode): void;
  setSidebarOpen(open: boolean): void;
  setCodeLineNumbers(value: boolean): void;
  setCodeWordWrap(value: boolean): void;
}

export const UI_STORAGE_KEY = "angular-mastery:ui";

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      readingMode: DEFAULT_READING_MODE,
      sidebarOpen: true,
      codeLineNumbers: true,
      codeWordWrap: false,
      hydrated: false,
      setReadingMode: (readingMode) => set({ readingMode }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCodeLineNumbers: (codeLineNumbers) => set({ codeLineNumbers }),
      setCodeWordWrap: (codeWordWrap) => set({ codeWordWrap }),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ readingMode, sidebarOpen, codeLineNumbers, codeWordWrap }) => ({
        readingMode,
        sidebarOpen,
        codeLineNumbers,
        codeWordWrap,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<UiState>;
        return {
          ...current,
          readingMode: isReadingMode(stored.readingMode) ? stored.readingMode : current.readingMode,
          sidebarOpen: typeof stored.sidebarOpen === "boolean" ? stored.sidebarOpen : current.sidebarOpen,
          codeLineNumbers: typeof stored.codeLineNumbers === "boolean" ? stored.codeLineNumbers : current.codeLineNumbers,
          codeWordWrap: typeof stored.codeWordWrap === "boolean" ? stored.codeWordWrap : current.codeWordWrap,
        };
      },
      onRehydrateStorage: () => () => {
        useUiStore.setState({ hydrated: true });
      },
    },
  ),
);
