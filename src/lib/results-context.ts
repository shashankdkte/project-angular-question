/**
 * Remembers the last list a learner browsed (filters + order) for the current
 * browser session, so a question page can offer "Back to results", the
 * position within those results, and previous/next within the same list.
 *
 * Session-scoped on purpose: it is navigation context, not learning progress.
 */

const KEY = "angular-mastery:results";

export interface ResultsItem {
  id: string;
  title: string;
}

export interface ResultsContext {
  /** Path + query of the list, e.g. /questions?difficulty=beginner. */
  href: string;
  label: string;
  items: ResultsItem[];
}

export function saveResultsContext(context: ResultsContext): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context));
  } catch {
    /* storage unavailable or full: navigation falls back to curriculum order */
  }
}

/** Raw stored string; a stable snapshot value for `useSyncExternalStore`. */
export function readResultsContextRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readResultsContext(): ResultsContext | null {
  return parseResultsContext(readResultsContextRaw());
}

export function parseResultsContext(raw: string | null): ResultsContext | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResultsContext>;
    if (typeof parsed.href !== "string" || !Array.isArray(parsed.items)) return null;
    return {
      href: parsed.href,
      label: typeof parsed.label === "string" ? parsed.label : "results",
      items: parsed.items.filter((item): item is ResultsItem => typeof item?.id === "string" && typeof item?.title === "string"),
    };
  } catch {
    return null;
  }
}
