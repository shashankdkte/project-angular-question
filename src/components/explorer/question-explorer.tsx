"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, Flag, ListFilter, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { EmptyState } from "@/components/common/page";
import { useProgressStore } from "@/lib/progress/store";
import { statusOf } from "@/lib/progress/stats";
import { saveResultsContext } from "@/lib/results-context";
import {
  ANY,
  DEFAULT_FILTERS,
  SORT_KEYS,
  SORT_LABELS,
  activeFilterCount,
  deriveFacets,
  filterQuestions,
  filtersFromParams,
  filtersToParams,
  sortQuestions,
  type QuestionFilters,
  type SortKey,
} from "@/lib/search/filters";
import { cn } from "@/lib/utils";
import type { QuestionSummary } from "@/types/content";
import { FacetCombobox, FacetSelect } from "./facet-controls";
import { QuestionRow } from "./question-row";

interface QuestionExplorerProps {
  questions: QuestionSummary[];
  /** Path this list lives at; used for URL sync and "Back to results". */
  basePath: string;
  /** Filters fixed by the page (e.g. a level page or the bookmarks page). They are not shown as controls. */
  locked?: Partial<QuestionFilters>;
  /** Label for the results-context link, e.g. "Beginner". */
  contextLabel?: string;
  emptyDatasetTitle?: string;
  emptyDatasetDescription?: React.ReactNode;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/40 pr-1.5 pl-2.5 text-xs text-foreground/80 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Remove filter ${label}`}
    >
      {label}
      <X aria-hidden className="size-3" />
    </button>
  );
}

export function QuestionExplorer({
  questions,
  basePath,
  locked,
  contextLabel = "results",
  emptyDatasetTitle = "No questions are loaded yet",
  emptyDatasetDescription = "Add a question batch under data/questions and run the content build. Nothing is shown until real content exists.",
}: QuestionExplorerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hydrated = useProgressStore((state) => state.hydrated);
  const progress = useProgressStore((state) => state.questions);
  const recent = useProgressStore((state) => state.recent);

  const initial = React.useMemo(() => filtersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [filters, setFilters] = React.useState<QuestionFilters>(() => ({ ...initial.filters, ...locked }));
  const [sort, setSort] = React.useState<SortKey | null>(initial.sort);
  const [showFilters, setShowFilters] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const effective = React.useMemo(() => ({ ...filters, ...locked }), [filters, locked]);
  const deferredQuery = React.useDeferredValue(effective.query);
  const facets = React.useMemo(() => deriveFacets(questions), [questions]);

  const update = React.useCallback(<K extends keyof QuestionFilters>(key: K, value: QuestionFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clearAll = () => {
    setFilters({ ...DEFAULT_FILTERS, ...locked });
    setSort(null);
  };

  /** Filters the learner controls: locked ones belong to the page, not to the URL or the chips. */
  const stripLocked = React.useCallback(
    (value: QuestionFilters): QuestionFilters => {
      const copy: Record<string, unknown> = { ...value };
      for (const key of Object.keys(locked ?? {}) as Array<keyof QuestionFilters>) copy[key] = DEFAULT_FILTERS[key];
      return copy as unknown as QuestionFilters;
    },
    [locked],
  );

  // Keep the URL shareable and refresh-safe without adding history entries.
  React.useEffect(() => {
    const qs = filtersToParams(stripLocked(filters), sort).toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(window.history.state, "", next);
  }, [filters, sort, stripLocked, pathname]);

  const needsProgress = effective.status !== ANY || effective.bookmarkedOnly || effective.revisionOnly || sort === "recent";
  const waiting = !hydrated && needsProgress;

  const results = React.useMemo(() => {
    if (waiting) return [];
    const context = { progress: { questions: progress, recent } };
    const { items, relevance } = filterQuestions(questions, { ...effective, query: deferredQuery }, context);
    const activeSort: SortKey = sort ?? (relevance ? "relevance" : "sequence");
    return sortQuestions(items, activeSort === "relevance" && !relevance ? "sequence" : activeSort, context, relevance);
  }, [questions, effective, deferredQuery, sort, progress, recent, waiting]);

  // Remember this list so a question page can offer back-to-results, position and in-list prev/next.
  React.useEffect(() => {
    if (waiting) return;
    const qs = filtersToParams(stripLocked(filters), sort).toString();
    saveResultsContext({
      href: qs ? `${basePath}?${qs}` : basePath,
      label: contextLabel,
      items: results.map((question) => ({ id: question.id, title: question.topic })),
    });
  }, [results, filters, sort, stripLocked, basePath, contextLabel, waiting]);

  // "/" focuses search, like most documentation sites.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const index = links.findIndex((link) => link === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    links[Math.min(links.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };

  if (questions.length === 0) {
    return <EmptyState icon={SearchX} title={emptyDatasetTitle} description={emptyDatasetDescription} />;
  }

  const activeCount = activeFilterCount(stripLocked(effective));
  const hasQuery = effective.query.trim() !== "";
  const sortValue: SortKey = sort ?? (hasQuery ? "relevance" : "sequence");
  const lockedKeys = new Set(Object.keys(locked ?? {}));

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  const pushChip = (key: keyof QuestionFilters, label: string | undefined) => {
    if (!label || lockedKeys.has(key)) return;
    chips.push({ key, label, clear: () => update(key, DEFAULT_FILTERS[key] as never) });
  };
  const labelOf = (options: Array<{ value: string; label: string }>, value: string) => options.find((o) => o.value === value)?.label ?? value;
  if (effective.difficulty !== ANY) pushChip("difficulty", labelOf(facets.difficulty, effective.difficulty));
  if (effective.questionType !== ANY) pushChip("questionType", labelOf(facets.questionType, effective.questionType));
  if (effective.priority !== ANY) pushChip("priority", `${labelOf(facets.priority, effective.priority)} priority`);
  if (effective.status !== ANY) pushChip("status", `Status: ${effective.status.replace("-", " ")}`);
  if (effective.industry !== ANY) pushChip("industry", labelOf(facets.industry, effective.industry));
  if (effective.role !== ANY) pushChip("role", labelOf(facets.role, effective.role));
  if (effective.domain !== ANY) pushChip("domain", labelOf(facets.domain, effective.domain));
  if (effective.topic !== ANY) pushChip("topic", labelOf(facets.topic, effective.topic));
  if (effective.bookmarkedOnly) pushChip("bookmarkedOnly", "Bookmarked");
  if (effective.revisionOnly) pushChip("revisionOnly", "Revise later");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="search"
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
              placeholder="Search title, topic, domain, tag or ID…  ( / )"
              aria-label="Search questions"
              className="pl-9"
              data-testid="explorer-search"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="md:hidden"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              aria-controls="explorer-filters"
            >
              <ListFilter aria-hidden /> Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
            <Select value={sortValue} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger aria-label="Sort questions" className="w-full sm:w-52" data-testid="explorer-sort">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="shrink-0 text-muted-foreground">Sort</span>
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {SORT_KEYS.filter((key) => key !== "relevance" || hasQuery).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          id="explorer-filters"
          className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", !showFilters && "hidden md:grid")}
          role="group"
          aria-label="Filters"
        >
          {!lockedKeys.has("difficulty") && (
            <FacetSelect label="Difficulty" value={effective.difficulty} options={facets.difficulty} onChange={(v) => update("difficulty", v)} />
          )}
          <FacetSelect label="Type" value={effective.questionType} options={facets.questionType} onChange={(v) => update("questionType", v)} />
          <FacetSelect label="Priority" value={effective.priority} options={facets.priority} onChange={(v) => update("priority", v)} />
          {!lockedKeys.has("status") && (
            <FacetSelect
              label="Status"
              value={effective.status}
              options={(["not-started", "learning", "practicing", "mastered"] as const).map((value) => ({
                value,
                label: value === "not-started" ? "Not started" : value[0].toUpperCase() + value.slice(1),
                count: questions.filter((q) => statusOf(progress, q.id) === value).length,
              }))}
              onChange={(v) => update("status", v)}
            />
          )}
          {!lockedKeys.has("industry") && (
            <FacetSelect label="Industry" value={effective.industry} options={facets.industry} onChange={(v) => update("industry", v)} />
          )}
          <FacetSelect label="Role" value={effective.role} options={facets.role} onChange={(v) => update("role", v)} />
          <FacetCombobox label="Domain" value={effective.domain} options={facets.domain} onChange={(v) => update("domain", v)} />
          <FacetCombobox label="Topic" value={effective.topic} options={facets.topic} onChange={(v) => update("topic", v)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!lockedKeys.has("bookmarkedOnly") && (
            <Toggle
              size="sm"
              variant="outline"
              pressed={effective.bookmarkedOnly}
              onPressedChange={(value) => update("bookmarkedOnly", value)}
              aria-label="Bookmarked only"
              data-testid="filter-bookmarked"
            >
              <Bookmark aria-hidden /> Bookmarked
            </Toggle>
          )}
          <Toggle
            size="sm"
            variant="outline"
            pressed={effective.revisionOnly}
            onPressedChange={(value) => update("revisionOnly", value)}
            aria-label="Revise later only"
          >
            <Flag aria-hidden /> Revise later
          </Toggle>
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={chip.clear} />
          ))}
          {(activeCount > 0 || hasQuery) && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground" data-testid="clear-filters">
              Clear all
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="result-count">
        {waiting ? "Loading your progress…" : `Showing ${results.length} of ${questions.length} loaded question${questions.length === 1 ? "" : "s"}`}
      </p>

      {waiting ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No questions match these filters"
          description={
            effective.bookmarkedOnly && !hasQuery && activeCount === (lockedKeys.has("bookmarkedOnly") ? 0 : 1)
              ? "You haven't bookmarked any questions yet. Use the bookmark button on a question to save it here."
              : "Try removing a filter or searching with different words."
          }
          action={
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul ref={listRef} onKeyDown={onListKeyDown} className="-mx-3 divide-y divide-border/60 border-y" data-testid="question-list">
          {results.map((question) => {
            const entry = progress[question.id];
            return (
              <QuestionRow
                key={question.id}
                question={question}
                status={statusOf(progress, question.id)}
                bookmarked={entry?.bookmarked ?? false}
                revision={entry?.revision ?? false}
                showDifficulty={!lockedKeys.has("difficulty")}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
