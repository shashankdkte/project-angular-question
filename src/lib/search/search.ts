import MiniSearch from "minisearch";
import type { QuestionSummary } from "../../types/content";

/**
 * Lightweight client-side full-text search over the question index.
 *
 * Matches question text, topics, domains, tags and ids. The MiniSearch index is
 * built once per question array (WeakMap-cached) in a few milliseconds even for
 * 600 records, then each keystroke is a prefix/fuzzy lookup.
 */

interface SearchDocument {
  id: string;
  topic: string;
  question: string;
  domain: string;
  tags: string;
  /** Spaced id so "beg 1" / "ang beg 001" tokenise sensibly. */
  idText: string;
  sequence: string;
}

const indexCache = new WeakMap<QuestionSummary[], MiniSearch<SearchDocument>>();

function toDocument(q: QuestionSummary): SearchDocument {
  return {
    id: q.id,
    topic: q.topic,
    question: q.question,
    domain: q.domain,
    tags: q.tags.join(" "),
    idText: q.id.replace(/-/g, " "),
    sequence: String(q.sequence),
  };
}

export function getSearchIndex(questions: QuestionSummary[]): MiniSearch<SearchDocument> {
  const cached = indexCache.get(questions);
  if (cached) return cached;
  const index = new MiniSearch<SearchDocument>({
    fields: ["topic", "question", "domain", "tags", "idText"],
    idField: "id",
    searchOptions: {
      prefix: true,
      boost: { topic: 3, tags: 2, idText: 2, domain: 1.5 },
    },
  });
  index.addAll(questions.map(toDocument));
  indexCache.set(questions, index);
  return index;
}

/** `ANG-BEG-007`, `beg-7`, `BEG 007` -> candidate id parts. */
const ID_QUERY = /^(?:ang[\s-]*)?([a-z]{3})[\s-]*0*(\d{1,3})$/i;
const NUMBER_QUERY = /^#?\s*0*(\d{1,3})$/;

/**
 * Returns matching ids in relevance order, or null when the query is empty
 * (meaning "no text filter").
 */
export function searchQuestionIds(questions: QuestionSummary[], rawQuery: string): string[] | null {
  const query = rawQuery.trim();
  if (query.length === 0) return null;

  const idMatch = ID_QUERY.exec(query);
  if (idMatch) {
    const [, code, digits] = idMatch;
    const direct = questions.filter(
      (q) => q.id.toLowerCase().includes(`-${code.toLowerCase()}-`) && q.sequence === Number(digits),
    );
    if (direct.length > 0) return direct.map((q) => q.id);
  }

  const numberMatch = NUMBER_QUERY.exec(query);
  if (numberMatch) {
    const sequence = Number(numberMatch[1]);
    const byNumber = questions.filter((q) => q.sequence === sequence).map((q) => q.id);
    if (byNumber.length > 0) return byNumber;
  }

  const index = getSearchIndex(questions);
  let results = index.search(query, { combineWith: "AND" });
  if (results.length === 0) {
    // Looser fallback: any word may match. Short words are matched exactly, so a nonsense query
    // like "xqzv a b" cannot fuzzy-match half the catalogue.
    results = index.search(query, {
      combineWith: "OR",
      prefix: (term) => term.length >= 4,
      fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
    });
  }
  return results.map((result) => String(result.id));
}
