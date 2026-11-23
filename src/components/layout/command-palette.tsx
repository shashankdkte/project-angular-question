"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { DIFFICULTY_META } from "@/lib/curriculum";
import { searchQuestionIds } from "@/lib/search/search";
import type { QuestionSummary } from "@/types/content";
import { useCommandPalette } from "./command-store";
import { LEVEL_NAV, PRIMARY_NAV, SECONDARY_NAV } from "./nav-config";

const MAX_RESULTS = 12;

/** One shared promise: the static index is fetched at most once, and only when the palette is first opened. */
let indexPromise: Promise<QuestionSummary[]> | null = null;
function loadIndex(): Promise<QuestionSummary[]> {
  indexPromise ??= fetch("/content/index.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ questions: QuestionSummary[] }>;
    })
    .then((index) => index.questions)
    .catch((error) => {
      indexPromise = null; // allow retry
      throw error;
    });
  return indexPromise;
}

export function CommandPalette() {
  const router = useRouter();
  const open = useCommandPalette((state) => state.open);
  const setOpen = useCommandPalette((state) => state.setOpen);
  const [questions, setQuestions] = React.useState<QuestionSummary[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        useCommandPalette.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open || questions) return;
    let cancelled = false;
    loadIndex()
      .then((loaded) => !cancelled && setQuestions(loaded))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, questions]);

  const results = React.useMemo(() => {
    if (!questions || deferredQuery.trim() === "") return [];
    const byId = new Map(questions.map((question) => [question.id, question]));
    return (searchQuestionIds(questions, deferredQuery) ?? [])
      .slice(0, MAX_RESULTS)
      .map((id) => byId.get(id))
      .filter((question): question is QuestionSummary => Boolean(question));
  }, [questions, deferredQuery]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router, setOpen],
  );

  const searching = query.trim() !== "";

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="Search Angular Mastery"
      description="Search questions by title, topic, domain, tag or id, or jump to a page."
    >
      <Command shouldFilter={false} label="Search questions">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search questions, topics, tags or ids (e.g. ANG-BEG-003)"
        />
        <CommandList className="max-h-[min(60vh,420px)]">
          {searching && !questions && !failed && (
            <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading search index">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
            </div>
          )}
          {failed && <div className="p-4 text-sm text-muted-foreground">Could not load the search index. Try reloading the page.</div>}

          {searching && questions && results.length === 0 && <CommandEmpty>No questions match “{query.trim()}”.</CommandEmpty>}

          {results.length > 0 && (
            <CommandGroup heading={`Questions (${results.length}${results.length === MAX_RESULTS ? "+" : ""})`}>
              {results.map((question) => (
                <CommandItem
                  key={question.id}
                  value={question.id}
                  onSelect={() => go(`/questions/${question.id}`)}
                  className="items-start gap-3 py-2"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {String(question.sequence).padStart(3, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{question.topic}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {DIFFICULTY_META[question.difficulty].label} · {question.domain}
                    </span>
                  </span>
                  <CornerDownLeft aria-hidden className="mt-1 size-3 shrink-0 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!searching && (
            <>
              <CommandGroup heading="Go to">
                {[...PRIMARY_NAV, ...LEVEL_NAV, ...SECONDARY_NAV].map((item) => (
                  <CommandItem key={item.href} value={`nav ${item.label}`} onSelect={() => go(item.href)}>
                    {item.icon ? <item.icon aria-hidden /> : <span aria-hidden className="size-4" />}
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
