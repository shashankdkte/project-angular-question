import { describe, expect, it } from "vitest";
import {
  ANY,
  DEFAULT_FILTERS,
  activeFilterCount,
  deriveFacets,
  filterQuestions,
  filtersFromParams,
  filtersToParams,
  sortQuestions,
} from "../../../src/lib/search/filters";
import { searchQuestionIds } from "../../../src/lib/search/search";
import { emptyProgress } from "../../../src/lib/progress/types";
import { makeSummaries, makeSummary } from "../../helpers/summaries";

const questions = makeSummaries();
const context = { progress: emptyProgress() };

describe("search", () => {
  it("returns null for an empty query (meaning: no text filter)", () => {
    expect(searchQuestionIds(questions, "")).toBeNull();
    expect(searchQuestionIds(questions, "   ")).toBeNull();
  });

  it("matches title/topic, question text, domain and tags", () => {
    expect(searchQuestionIds(questions, "equality")).toEqual(["ANG-BEG-002"]);
    expect(searchQuestionIds(questions, "OnPush")).toEqual(["ANG-INT-001"]);
    expect(searchQuestionIds(questions, "angular core")).toEqual(["ANG-INT-001"]);
    expect(searchQuestionIds(questions, "hoisting")).toEqual(["ANG-BEG-001"]);
  });

  it("matches prefixes while typing", () => {
    expect(searchQuestionIds(questions, "equal")).toContain("ANG-BEG-002");
  });

  it.each(["ANG-BEG-001", "ang-beg-1", "beg 001", "BEG-1"])("finds a question directly by id-like query %s", (query) => {
    expect(searchQuestionIds(questions, query)).toEqual(["ANG-BEG-001"]);
  });

  it("treats a bare number as a sequence number", () => {
    expect(searchQuestionIds(questions, "#2")).toEqual(["ANG-BEG-002"]);
  });

  it("returns an empty array (not null) when nothing matches", () => {
    expect(searchQuestionIds(questions, "kubernetes terraform")).toEqual([]);
  });

  it("does not let short or nonsense words fuzzy-match unrelated questions", () => {
    expect(searchQuestionIds(questions, "zzzz-not-a-real-topic")).toEqual([]);
    expect(searchQuestionIds(questions, "xq a b zz")).toEqual([]);
  });

  it("falls back to matching any word when not every word matches", () => {
    expect(searchQuestionIds(questions, "kubernetes operators")).toEqual(["ANG-BEG-002"]);
  });

  it("stays fast at curriculum scale (600 records)", () => {
    const big = Array.from({ length: 600 }, (_, index) =>
      makeSummary({ id: `ANG-BEG-${String(index + 1).padStart(3, "0")}`, sequence: index + 1, topic: `Generated topic ${index + 1}`, tags: ["generated"] }),
    );
    searchQuestionIds(big, "warmup"); // build the index once
    const started = performance.now();
    for (let i = 0; i < 20; i += 1) searchQuestionIds(big, "generated topic 42");
    expect((performance.now() - started) / 20).toBeLessThan(50);
  });
});

describe("filters", () => {
  const run = (patch: Partial<typeof DEFAULT_FILTERS>) =>
    filterQuestions(questions, { ...DEFAULT_FILTERS, ...patch }, context).items.map((q) => q.id);

  it("returns everything with default filters", () => {
    expect(run({})).toHaveLength(3);
  });

  it("filters by difficulty, type, priority, domain and topic", () => {
    expect(run({ difficulty: "intermediate" })).toEqual(["ANG-INT-001"]);
    expect(run({ questionType: "debugging" })).toEqual(["ANG-BEG-002"]);
    expect(run({ priority: "critical" })).toEqual(["ANG-BEG-001"]);
    expect(run({ domain: "Angular Core" })).toEqual(["ANG-INT-001"]);
    expect(run({ topic: "Equality operators" })).toEqual(["ANG-BEG-002"]);
  });

  it("filters by industry and role using the arrays on each question", () => {
    expect(run({ industry: "ecommerce" })).toEqual(["ANG-BEG-001"]);
    expect(run({ role: "technical-lead" })).toEqual(["ANG-INT-001"]);
  });

  it("combines filters with AND semantics", () => {
    expect(run({ difficulty: "beginner", industry: "healthcare" })).toEqual(["ANG-BEG-002"]);
    expect(run({ difficulty: "intermediate", industry: "banking" })).toEqual([]);
  });

  it("combines a text query with structured filters", () => {
    expect(run({ query: "difference", difficulty: "beginner" }).sort()).toEqual(["ANG-BEG-001", "ANG-BEG-002"]);
    expect(run({ query: "difference", priority: "critical" })).toEqual(["ANG-BEG-001"]);
  });

  it("filters by learning status; unknown questions count as not started", () => {
    const progress = {
      questions: {
        "ANG-BEG-001": { status: "mastered", bookmarked: true, revision: false, notes: "", updatedAt: 1 },
        "ANG-BEG-002": { status: "learning", bookmarked: false, revision: true, notes: "", updatedAt: 1 },
      },
      recent: [],
    } as const;
    const withProgress = (patch: Partial<typeof DEFAULT_FILTERS>) =>
      filterQuestions(questions, { ...DEFAULT_FILTERS, ...patch }, { progress: structuredClone(progress) as never }).items.map((q) => q.id);
    expect(withProgress({ status: "mastered" })).toEqual(["ANG-BEG-001"]);
    expect(withProgress({ status: "not-started" })).toEqual(["ANG-INT-001"]);
    expect(withProgress({ bookmarkedOnly: true })).toEqual(["ANG-BEG-001"]);
    expect(withProgress({ revisionOnly: true })).toEqual(["ANG-BEG-002"]);
  });

  it("counts active filters (ignoring the text query)", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, difficulty: "beginner", bookmarkedOnly: true, query: "x" })).toBe(2);
  });
});

describe("sorting", () => {
  const ids = (items: ReturnType<typeof makeSummaries>) => items.map((q) => q.id);

  it("sorts by curriculum sequence: difficulty first, then sequence", () => {
    expect(ids(sortQuestions([...questions].reverse(), "sequence", context, null))).toEqual(["ANG-BEG-001", "ANG-BEG-002", "ANG-INT-001"]);
  });

  it("sorts by priority (critical first)", () => {
    expect(ids(sortQuestions(questions, "priority", context, null))).toEqual(["ANG-BEG-001", "ANG-BEG-002", "ANG-INT-001"]);
  });

  it("sorts by topic alphabetically", () => {
    expect(ids(sortQuestions(questions, "topic", context, null))).toEqual(["ANG-INT-001", "ANG-BEG-002", "ANG-BEG-001"]);
  });

  it("sorts by recently viewed, most recent first", () => {
    const progress = {
      questions: {
        "ANG-BEG-002": { status: "learning", bookmarked: false, revision: false, notes: "", updatedAt: 1, lastViewedAt: 200 },
        "ANG-INT-001": { status: "learning", bookmarked: false, revision: false, notes: "", updatedAt: 1, lastViewedAt: 100 },
      },
      recent: [],
    };
    expect(ids(sortQuestions(questions, "recent", { progress: progress as never }, null))).toEqual(["ANG-BEG-002", "ANG-INT-001", "ANG-BEG-001"]);
  });

  it("sorts by relevance when a query ranks results", () => {
    const { items, relevance } = filterQuestions(questions, { ...DEFAULT_FILTERS, query: "difference" }, context);
    expect(sortQuestions(items, "relevance", context, relevance)).toHaveLength(items.length);
  });
});

describe("facets are derived from loaded data", () => {
  it("lists only values present, with counts", () => {
    const facets = deriveFacets(questions);
    expect(facets.difficulty.map((o) => [o.value, o.count])).toEqual([
      ["beginner", 2],
      ["intermediate", 1],
    ]);
    expect(facets.industry.map((o) => o.value)).toEqual(["banking", "ecommerce", "healthcare", "saas"]);
    expect(facets.domain.map((o) => o.label)).toEqual(["Angular Core", "JavaScript Fundamentals"]);
  });

  it("is empty for an empty dataset (no invented options)", () => {
    const facets = deriveFacets([]);
    expect(Object.values(facets).every((options) => options.length === 0)).toBe(true);
  });

  it("includes values outside the known vocabulary instead of dropping them", () => {
    const facets = deriveFacets([makeSummary({ questionType: "brand-new-type" as never })]);
    expect(facets.questionType.map((o) => o.value)).toEqual(["brand-new-type"]);
  });
});

describe("URL serialisation", () => {
  it("round-trips filters and sort", () => {
    const filters = { ...DEFAULT_FILTERS, query: "scope", difficulty: "beginner", industry: "banking", bookmarkedOnly: true };
    const params = filtersToParams(filters, "priority");
    expect(params.toString()).toContain("q=scope");
    const parsed = filtersFromParams(new URLSearchParams(params.toString()));
    expect(parsed.filters).toEqual(filters);
    expect(parsed.sort).toBe("priority");
  });

  it("omits defaults so URLs stay clean", () => {
    expect(filtersToParams(DEFAULT_FILTERS, null).toString()).toBe("");
  });

  it("ignores an unknown sort key", () => {
    expect(filtersFromParams(new URLSearchParams("sort=nonsense")).sort).toBeNull();
  });

  it("treats the ANY sentinel as unfiltered", () => {
    expect(filtersToParams({ ...DEFAULT_FILTERS, topic: ANY }, null).toString()).toBe("");
  });
});
