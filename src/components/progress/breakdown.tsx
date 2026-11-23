"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GroupProgress, ProgressSummary } from "@/lib/progress/stats";

type Dimension = "difficulty" | "industry" | "domain" | "topic";

const DIMENSIONS: Array<{
  key: Dimension;
  label: string;
  rows: (summary: ProgressSummary) => GroupProgress[];
  href: (group: GroupProgress) => string;
  empty: string;
}> = [
  { key: "difficulty", label: "Difficulty", rows: (s) => s.byDifficulty, href: (g) => `/levels/${g.key}`, empty: "No questions loaded." },
  {
    key: "industry",
    label: "Industry",
    rows: (s) => s.byIndustry,
    href: (g) => `/questions?industry=${encodeURIComponent(g.key)}`,
    empty: "No industries yet. They appear as questions are loaded.",
  },
  {
    key: "domain",
    label: "Domain",
    rows: (s) => s.byDomain,
    href: (g) => `/questions?domain=${encodeURIComponent(g.key)}`,
    empty: "No domains yet. They appear as questions are loaded.",
  },
  {
    key: "topic",
    label: "Topic",
    rows: (s) => s.byTopic,
    href: (g) => `/questions?topic=${encodeURIComponent(g.key)}`,
    empty: "No topics yet. They appear as questions are loaded.",
  },
];

function Row({ group, href, showProgress }: { group: GroupProgress; href: string; showProgress: boolean }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
      <Link href={href} className="min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline">
        {group.label}
      </Link>
      <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
        <Progress
          value={showProgress ? group.percentOfLoaded : 0}
          className="h-1.5"
          aria-label={`${group.label}: ${showProgress ? group.percentOfLoaded : 0}% of loaded questions mastered`}
        />
      </span>
      <span className="text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {showProgress ? `${group.mastered}/${group.loaded} mastered` : `${group.loaded} loaded`}
        {group.target !== undefined && <span className="hidden sm:inline"> · target {group.target}</span>}
      </span>
    </li>
  );
}

/**
 * Progress by difficulty / industry / domain / topic. Long lists (topics at full scale) are truncated
 * with an explicit "Show all" so the page stays scannable.
 */
export function ProgressBreakdown({
  summary,
  hydrated,
  initialLimit = 8,
  dimensions = ["difficulty", "industry", "domain", "topic"],
}: {
  summary: ProgressSummary;
  hydrated: boolean;
  initialLimit?: number;
  dimensions?: Dimension[];
}) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const visible = DIMENSIONS.filter((dimension) => dimensions.includes(dimension.key));

  return (
    <Tabs defaultValue={visible[0]?.key} className="gap-4">
      <TabsList aria-label="Group progress by">
        {visible.map((dimension) => (
          <TabsTrigger key={dimension.key} value={dimension.key}>
            {dimension.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {visible.map((dimension) => {
        const rows = dimension.rows(summary);
        const open = expanded[dimension.key] ?? false;
        const shown = open ? rows : rows.slice(0, initialLimit);
        return (
          <TabsContent key={dimension.key} value={dimension.key}>
            {rows.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{dimension.empty}</p>
            ) : (
              <>
                <ul className="divide-y divide-border/60" data-testid={`breakdown-${dimension.key}`}>
                  {shown.map((group) => (
                    <Row key={group.key} group={group} href={dimension.href(group)} showProgress={hydrated} />
                  ))}
                </ul>
                {rows.length > initialLimit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={() => setExpanded((current) => ({ ...current, [dimension.key]: !open }))}
                  >
                    {open ? "Show fewer" : `Show all ${rows.length}`}
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
