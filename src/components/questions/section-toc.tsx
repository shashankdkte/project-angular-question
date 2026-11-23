"use client";

import { cn } from "@/lib/utils";

export interface TocEntry {
  key: string;
  title: string;
  open: boolean;
}

/** "On this page" list. Real in-page links so deep links, middle-click and screen readers all work. */
export function SectionToc({
  entries,
  activeKey,
  onSelect,
  className,
}: {
  entries: TocEntry[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label="On this page" className={className}>
      <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">On this page</p>
      <ol className="space-y-px border-l">
        {entries.map((entry, index) => {
          const active = entry.key === activeKey;
          return (
            <li key={entry.key}>
              <a
                href={`#${entry.key}`}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(entry.key);
                }}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px flex gap-2 border-l py-1 pr-1 pl-3 text-[13px] leading-snug transition-colors",
                  active
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <span aria-hidden className="w-4 shrink-0 text-right text-[11px] tabular-nums opacity-70">
                  {index + 1}
                </span>
                <span>{entry.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
