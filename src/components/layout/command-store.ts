"use client";

import { create } from "zustand";

/** Opens/closes the global search palette from anywhere (sidebar, top bar, shortcuts). */
export const useCommandPalette = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
