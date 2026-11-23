"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionNav } from "./use-question-navigation";

function positionText(nav: QuestionNav): string {
  const { index, total, scope } = nav.position;
  return scope === "results" ? `Result ${index} of ${total}` : `Question ${index} of ${total} loaded`;
}

/** Compact variant for the right sidebar. */
export function PagerCompact({ nav, className }: { nav: QuestionNav; className?: string }) {
  return (
    <nav aria-label="Question navigation" className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground" data-testid="question-position">
        {positionText(nav)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {nav.previous ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/questions/${nav.previous.id}`} rel="prev" title={nav.previous.title}>
              <ArrowLeft aria-hidden /> Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft aria-hidden /> Previous
          </Button>
        )}
        {nav.next ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/questions/${nav.next.id}`} rel="next" title={nav.next.title}>
              Next <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
      <Button asChild variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
        <Link href={nav.backHref}>
          <ListTree aria-hidden /> {nav.backLabel}
        </Link>
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Keyboard: <kbd className="rounded border px-1 font-mono">[</kbd> previous · <kbd className="rounded border px-1 font-mono">]</kbd> next
      </p>
    </nav>
  );
}

/** Full-width variant at the end of the article. */
export function PagerBottom({ nav }: { nav: QuestionNav }) {
  return (
    <nav aria-label="Previous and next question" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
      {nav.previous ? (
        <Link
          href={`/questions/${nav.previous.id}`}
          className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft aria-hidden className="size-3.5" /> Previous
          </span>
          <span className="mt-1 line-clamp-2 block text-sm font-medium">{nav.previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {nav.next ? (
        <Link
          href={`/questions/${nav.next.id}`}
          className="group rounded-lg border p-4 text-right transition-colors hover:bg-muted/50 sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Next <ArrowRight aria-hidden className="size-3.5" />
          </span>
          <span className="mt-1 line-clamp-2 block text-sm font-medium">{nav.next.title}</span>
        </Link>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-right text-sm text-muted-foreground sm:col-start-2">
          You have reached the last loaded question.
        </div>
      )}
    </nav>
  );
}
