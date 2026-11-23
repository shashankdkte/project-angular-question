"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronsDownUp, ChevronsUpDown, Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { READING_MODE_META, type ReadingMode } from "@/lib/curriculum";
import { useProgressStore } from "@/lib/progress/store";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { NotesEditor } from "./notes-editor";
import { PagerBottom, PagerCompact } from "./question-pager";
import { QuestionActions } from "./question-actions";
import { ReadingModeSwitch } from "./reading-mode-switch";
import { SectionToc } from "./section-toc";
import { useQuestionNavigation, type CurriculumNeighbors } from "./use-question-navigation";

export interface ReaderSection {
  key: string;
  title: string;
  shortTitle: string;
  /** Estimated reading effort in seconds, used for per-mode estimates. */
  seconds: number;
  /** Server-rendered body, produced by the section registry. */
  content: React.ReactNode;
}

interface QuestionReaderProps {
  questionId: string;
  sections: ReaderSection[];
  neighbors: CurriculumNeighbors;
  /** Server-rendered: breadcrumb, title, metadata, question text, quick answer. */
  header: React.ReactNode;
  /** Server-rendered: final takeaway, learning outcomes, source notes. */
  closing: React.ReactNode;
  /** Seconds to read the closing material (always shown). */
  closingSeconds: number;
}

/** Bottom edge of the sticky app bar (and compact contents bar on small screens), in px. */
const STICKY_OFFSET = 100;

function defaultOpenKeys(mode: ReadingMode, sections: ReaderSection[]): string[] {
  const expanded = READING_MODE_META[mode].expanded;
  return sections.filter((section) => expanded.includes(section.key)).map((section) => section.key);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function QuestionReader({ questionId, sections, neighbors, header, closing, closingSeconds }: QuestionReaderProps) {
  const mode = useUiStore((state) => state.readingMode);
  const setMode = useUiStore((state) => state.setReadingMode);
  const hydrated = useProgressStore((state) => state.hydrated);
  const markViewed = useProgressStore((state) => state.markViewed);
  const nav = useQuestionNavigation(questionId, neighbors);

  const keys = React.useMemo(() => sections.map((section) => section.key), [sections]);
  const [activeKey, setActiveKey] = React.useState<string | null>(keys[0] ?? null);
  /** Section chosen explicitly (contents list / deep link); see the scroll-spy below. */
  const pinnedRef = React.useRef<string | null>(null);

  /* Which sections are open. Changing reading mode (or moving to another question) resets them to the
     mode's defaults, keeping any section named in the URL hash open. This is derived during render
     (keyed by mode + question) rather than synced in an effect, so there is no extra flash render. */
  const signature = `${mode}:${questionId}`;
  const [openState, setOpenState] = React.useState(() => ({ signature, keys: defaultOpenKeys(mode, sections) }));
  let openKeys = openState.keys;
  if (openState.signature !== signature) {
    const defaults = defaultOpenKeys(mode, sections);
    const hashKey = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    openKeys = keys.includes(hashKey) && !defaults.includes(hashKey) ? [...defaults, hashKey] : defaults;
    setOpenState({ signature, keys: openKeys });
  }
  const setOpenKeys = React.useCallback((next: string[] | ((current: string[]) => string[])) => {
    setOpenState((state) => ({ ...state, keys: typeof next === "function" ? next(state.keys) : next }));
  }, []);

  const scrollToSection = React.useCallback((key: string) => {
    requestAnimationFrame(() => {
      document.getElementById(key)?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  }, []);

  const openSection = React.useCallback(
    (key: string) => {
      setOpenKeys((current) => (current.includes(key) ? current : [...current, key]));
      pinnedRef.current = key;
      setActiveKey(key);
      window.history.replaceState(null, "", `#${key}`);
      scrollToSection(key);
    },
    [scrollToSection, setOpenKeys],
  );

  // Deep link on first load, and back/forward through hashes.
  React.useEffect(() => {
    const go = () => {
      const key = window.location.hash.slice(1);
      if (key && keys.includes(key)) {
        setOpenKeys((current) => (current.includes(key) ? current : [...current, key]));
        pinnedRef.current = key;
        setActiveKey(key);
        scrollToSection(key);
      }
    };
    const timer = window.setTimeout(go, 50);
    window.addEventListener("hashchange", go);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", go);
    };
  }, [keys, questionId, scrollToSection, setOpenKeys]);

  /* Scroll-spy for the on-this-page navigation. The active section is the last one whose top has passed a
     reference line near the top of the viewport. A section the reader just chose from the contents list
     stays active while it is on screen (it may be unable to scroll all the way to the top near the end
     of the page); real user scrolling (wheel, touch, keys) releases that pin. */
  React.useEffect(() => {
    let frame = 0;
    const release = () => {
      pinnedRef.current = null;
    };
    const update = () => {
      frame = 0;
      const pinned = pinnedRef.current;
      if (pinned) {
        const rect = document.getElementById(pinned)?.getBoundingClientRect();
        if (rect && rect.bottom > STICKY_OFFSET && rect.top < window.innerHeight) return;
        pinnedRef.current = null;
      }
      const line = Math.min(240, window.innerHeight * 0.3);
      let current = keys[0];
      for (const key of keys) {
        const element = document.getElementById(key);
        if (element && element.getBoundingClientRect().top <= line) current = key;
      }
      setActiveKey(current ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [keys, questionId]);

  // Recently viewed: only after stored progress has loaded, so we never overwrite saved data.
  React.useEffect(() => {
    if (hydrated) markViewed(questionId);
  }, [hydrated, markViewed, questionId]);

  const minutes = React.useMemo(() => {
    const expanded = READING_MODE_META[mode].expanded;
    const seconds = sections.filter((s) => expanded.includes(s.key)).reduce((sum, s) => sum + s.seconds, 0) + closingSeconds;
    return Math.max(1, Math.ceil(seconds / 60));
  }, [mode, sections, closingSeconds]);

  const toc = sections.map((section) => ({ key: section.key, title: section.shortTitle, open: openKeys.includes(section.key) }));
  const activeTitle = sections.find((section) => section.key === activeKey)?.shortTitle ?? sections[0]?.shortTitle ?? "";
  const activeIndex = Math.max(0, keys.indexOf(activeKey ?? keys[0]));
  const allOpen = openKeys.length === sections.length;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
      {/* Compact in-page navigation for mobile and tablet (the right sidebar takes over from xl). */}
      <div className="sticky top-12 z-20 -mx-4 border-b bg-background/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:hidden">
        <div className="flex h-11 items-center justify-between gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-w-0 gap-1.5 px-2" aria-label="Jump to section">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {activeIndex + 1}/{sections.length}
                </span>
                <span className="truncate text-sm font-medium">{activeTitle}</span>
                <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[65vh] w-64 overflow-y-auto">
              {sections.map((section, index) => (
                <DropdownMenuItem key={section.key} onSelect={() => openSection(section.key)}>
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                  {section.shortTitle}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock aria-hidden className="size-3.5" /> ~{minutes} min
          </span>
        </div>
      </div>

      <div className="grid gap-x-12 py-8 xl:grid-cols-[minmax(0,1fr)_240px]">
        <article className="mx-auto w-full max-w-3xl min-w-0 space-y-8" aria-labelledby="question-title" data-testid="question-article">
          {header}

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <ReadingModeSwitch value={mode} onChange={setMode} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenKeys(allOpen ? [] : keys)}
                aria-label={allOpen ? "Collapse all sections" : "Expand all sections"}
              >
                {allOpen ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
            </div>
            <Separator />
          </div>

          <Accordion type="multiple" value={openKeys} onValueChange={setOpenKeys} className="space-y-0" data-testid="answer-sections">
            {sections.map((section, index) => (
              <AccordionItem
                key={section.key}
                value={section.key}
                id={section.key}
                data-section={section.key}
                className="scroll-mt-28 border-b last:border-b-0"
              >
                <AccordionTrigger className="items-center py-4 text-base font-semibold tracking-tight hover:no-underline">
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span aria-hidden className="w-6 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{section.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="-mx-1 px-1 pt-1 pb-8 pl-1 sm:pl-9">{section.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="space-y-8">{closing}</div>

          <NotesEditor questionId={questionId} />

          <PagerBottom nav={nav} />
        </article>

        <aside aria-label="Question tools" className="hidden xl:block">
          <div className="sticky top-16 max-h-[calc(100svh-5rem)] space-y-6 overflow-y-auto pr-1 pb-6">
            <SectionToc entries={toc} activeKey={activeKey} onSelect={openSection} />
            <Separator />
            <section aria-labelledby="progress-heading" className="space-y-3">
              <h2 id="progress-heading" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                This question
              </h2>
              <QuestionActions questionId={questionId} idPrefix="aside" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="reading-time">
                <Clock aria-hidden className="size-3.5" /> ~{minutes} min · {READING_MODE_META[mode].label}
              </p>
            </section>
            <Separator />
            <PagerCompact nav={nav} />
          </div>
        </aside>
      </div>

      {/* Below xl the tools sit in a compact panel at the end of the page. */}
      <div className="mx-auto mb-10 max-w-3xl xl:hidden">
        <section aria-labelledby="mobile-tools-heading" className={cn("space-y-4 rounded-lg border p-4")}>
          <h2 id="mobile-tools-heading" className="text-sm font-semibold tracking-tight">
            Track this question
          </h2>
          <QuestionActions questionId={questionId} idPrefix="inline" />
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={nav.backHref}>
              <ArrowLeft aria-hidden /> {nav.backLabel}
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
