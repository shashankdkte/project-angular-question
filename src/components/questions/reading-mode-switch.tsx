"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { READING_MODES, READING_MODE_META, isReadingMode, type ReadingMode } from "@/lib/curriculum";

const SHORT_LABEL: Record<ReadingMode, string> = { quick: "Quick", standard: "Standard", deep: "Deep Dive" };

/**
 * Presentation preference only: changes which sections start expanded.
 * No section is ever removed or altered by the mode.
 */
export function ReadingModeSwitch({ value, onChange }: { value: ReadingMode; onChange: (mode: ReadingMode) => void }) {
  return (
    <div className="space-y-1.5">
      <Tabs value={value} onValueChange={(next) => isReadingMode(next) && onChange(next)}>
        <TabsList aria-label="Reading mode" className="h-9 w-full sm:w-auto">
          {READING_MODES.map((mode) => (
            <TabsTrigger key={mode} value={mode} aria-label={READING_MODE_META[mode].label} className="px-3 sm:px-4">
              <span className="sm:hidden" aria-hidden>
                {SHORT_LABEL[mode]}
              </span>
              <span className="hidden sm:inline" aria-hidden>
                {READING_MODE_META[mode].label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {READING_MODE_META[value].description} All sections stay available.
      </p>
    </div>
  );
}
