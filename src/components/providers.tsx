"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";
import { useProgressStore } from "@/lib/progress/store";
import { UI_STORAGE_KEY, useUiStore } from "@/lib/ui-store";

/**
 * Rehydrates persisted client state after mount. Stores are created with
 * `skipHydration`, so the server render and the first client render always
 * match (no hydration warnings); persisted values appear right after.
 * Also keeps multiple tabs in sync via the `storage` event.
 */
function StoreHydrator() {
  React.useEffect(() => {
    // `data-app-ready` marks "client JS is running and saved state is loaded". Tests (and any monitoring)
    // can wait for it instead of guessing when hydration has finished.
    void Promise.all([useProgressStore.persist.rehydrate(), useUiStore.persist.rehydrate()]).then(() => {
      document.documentElement.dataset.appReady = "true";
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === PROGRESS_STORAGE_KEY) void useProgressStore.persist.rehydrate();
      if (event.key === UI_STORAGE_KEY) void useUiStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <StoreHydrator />
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
