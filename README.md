# Angular Mastery

A JSON-driven learning platform for a 600-question Angular curriculum: a minimalist reading experience (think Linear / Notion / Vercel docs) built on Next.js. Questions are authored as JSON batches; the app discovers, validates and indexes them at build time, so **adding content never requires touching the UI**.

- No backend, auth, database, AI integration, payments or CMS. Everything is static content plus browser `localStorage`.
- The only fixed number is the curriculum target (**600**: Beginner 135, Intermediate 165, Advanced 165, Expert 135). Every other count (loaded, completed, bookmarked, per-level, per-topic, per-industry, ...) is derived from the data that is actually loaded.
- Nothing is placeholder: if a level has no questions yet, the UI says so honestly.

## Setup

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev          # builds the content index, watches data/ + schemas/, starts Next on :3000
```

| Command                    | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`              | Content index + file watcher + `next dev`                                    |
| `npm run build`            | `prebuild` (validate + index) then `next build`; fails on invalid content    |
| `npm start`                | Serve the production build                                                   |
| `npm run validate:content` | Validate every batch and print a report (exit code 1 on any error)           |
| `npm run content:build`    | Rebuild only the content index and per-question files                        |
| `npm run typecheck`        | `tsc --noEmit`                                                               |
| `npm run lint`             | ESLint                                                                       |
| `npm test`                 | Vitest unit/component/integration tests                                      |
| `npm run test:e2e`         | Playwright (builds, starts a production server on :3200, runs desktop + mobile) |

First time running e2e tests: `npx playwright install chromium`.

## Adding question batches

1. Drop a JSON file into `data/questions/<difficulty>/` (`beginner`, `intermediate`, `advanced`, `expert`). Any file name works; the existing ones (`beginner_01_questions_001_005.json`) are just a convention. Files are found by globbing, **not** by a hard-coded list.
2. The file must follow `schemas/question_batch_schema_v1.json` (the authoritative schema; this project does not define a competing one).
3. Run `npm run validate:content` to see errors and warnings.
4. `npm run dev` picks the file up automatically (reload the page). For a production build, run `npm run build`.

Source JSON is **never modified** by the app or the scripts. Generated output goes to `generated/` and `public/content/` (both git-ignored).

### What validation checks

Validation runs in three layers and is also executed as part of `npm run build`.

1. **Structure**: Ajv against the real JSON schema, then Zod for the typed model. Unknown extra fields are tolerated (loose objects) so future schema additions do not break the build.
2. **Semantics (errors, block the build)**: duplicate question IDs or sequences (within a file and across files), duplicate batch IDs, dataset mismatch, ID/sequence mismatch (`ANG-BEG-007` must have sequence 7), sequence outside the curriculum or the batch range, `answerSectionOrder` not matching the canonical 15 sections, batch count/range inconsistencies, difficulty mismatches, unknown roles/industries, unparsable JSON.
3. **Quality (warnings, never block)**: missing or unsafe Mermaid diagrams, unsupported code language, empty follow-ups, missing tags/learning outcomes/verification command, definition length, characteristic count, unresolved cross-references, unknown priority, and so on.

A rejected file is excluded and reported; the remaining valid files still load. Questions are never half-loaded.

## Architecture

```
data/questions/<difficulty>/*.json   authoritative content (never mutated)
data/projects/**/*.json              optional project plans (see below)
schemas/question_batch_schema_v1.json
scripts/                             dev watcher, validate-content, build-content-index
src/lib/content/                     discovery, validation, normalisation, ingestion
src/lib/schemas/                     Zod models (question, answer, project)
src/lib/search/                      MiniSearch index + filter/sort logic
src/lib/progress/                    versioned store, migration, export/import, stats
src/lib/diagrams/                    Mermaid loader + safety checks
src/lib/code/                        Shiki highlighting (server-side only)
src/components/                      layout, explorer, questions (reader + section renderers), diagrams, progress, dashboard, projects, ui (shadcn)
src/app/                             App Router pages
tests/unit, tests/e2e                Vitest and Playwright
```

Stack: Next.js (App Router, static generation), React, strict TypeScript, Tailwind CSS, shadcn/ui, Lucide, Mermaid, Shiki, Zod, Ajv, MiniSearch, Zustand (only for progress and UI preferences), next-themes.

### Data loading

- **Build time**: `ingest` discovers all batch files, validates them, normalises each question and writes
  - `generated/index.json`: a small **summary index** (id, topic, question, level, domain, tags, roles, industries, type, priority, ...; about 0.7 KB per question),
  - `generated/questions/<id>.json`: one **full record** per question,
  - `generated/projects.json` and `generated/report.json`.
- **Browsing** (dashboard, explorer, levels, industries, bookmarks, progress) only ever uses the summary index. Search and filters run in the browser over that index. There is **no HTTP request per JSON file**.
- **Reading** `/questions/ANG-BEG-001`: each question page is statically generated from its own record. The answer is rendered on the server (including Shiki-highlighted code) and only that question's content is sent. Answers for the whole curriculum are never part of the initial client JavaScript.
- The command palette lazily fetches one static file, `/content/index.json` (a copy of the summary index), the first time it opens.
- Mermaid is lazy-loaded only when a diagram scrolls into view.

### Progress

Stored in `localStorage` (key `angular-mastery:progress`) with a schema version and a migration chain. Per question: status (`not-started`, `learning`, `practicing`, `mastered`), bookmark, revise-later, notes, last viewed. Rules worth knowing:

- Only the status **`mastered`** counts as completed. Opening a page records "recently viewed" but never completes anything.
- Completion % is computed against **loaded** questions; the 600 target is shown separately.
- Progress for IDs that no longer exist is kept (not deleted) and simply not counted.
- Export/import as JSON from the Progress page. Import validates and migrates the file (older versions are upgraded) and lets you either **replace** current progress or **merge** it in. If stored progress is ever unreadable, a backup copy is kept under `angular-mastery:progress:backup:<timestamp>` instead of being silently destroyed.
- The stores rehydrate after mount and writes are disabled until then, so server HTML and the first client render always match and saved data can never be overwritten by defaults.

### Reading modes

Quick Review / Standard Learning / Deep Dive only change **which sections start expanded** and the estimated reading time. They never delete or hide content: every one of the 15 sections can still be opened at any time.

### Projects

`/projects` renders `data/projects/**/*.json` if present, and an honest empty state otherwise. Nothing is invented. File shape:

```json
{
  "schemaVersion": "1.0.0",
  "projects": [
    {
      "id": "banking-ledger",
      "industry": "banking",
      "title": "Double-entry ledger",
      "description": "A suggested project for practising ...",
      "status": "planned",
      "techStack": ["Angular", "NestJS"],
      "businessObjectives": [],
      "modules": [{ "name": "Accounts" }],
      "milestones": [{ "title": "Domain model", "status": "planned" }],
      "relatedQuestionIds": ["ANG-BEG-001"]
    }
  ]
}
```

`status` defaults to `planned`. Projects are presented as suggestions, never as something the learner has built; `repositoryUrl` is shown only if you supply one.

### Security

- Content is data, never code: nothing from the JSON is evaluated, and no raw HTML from JSON is injected.
- Mermaid runs with `securityLevel: "strict"`; diagram sources are additionally screened at validation time and again before rendering (script/HTML/click-handler/external-resource constructs are refused and shown as a readable fallback with the source). The SVG download is only offered when the rendered SVG passes a safety check.
- Question IDs are validated against a strict pattern before being used to build file paths.

## Features

- Dashboard: target vs loaded vs completed vs bookmarked, completion % of loaded questions, breakdowns by level/topic/industry/role/type, Continue Learning, Recently Viewed, Browse Curriculum.
- Explorer: search (ID/number lookup, AND search, fuzzy fallback) plus filters for difficulty, topic, domain, question type, industry, role, priority, status and bookmarked; sorting; URL-synced filters; empty states; keyboard support (`/` to search, arrows to move between results).
- Question reader: 15 specialised section renderers (tables, comparison matrices, step lists, code with copy, tabs, callouts, Mermaid diagrams with zoom/fit/full screen/copy/download), deep links to sections, on-this-page navigation with scroll-spy, reading time, status/bookmark/revise-later/notes, previous/next that follow your current results, back-to-results, `[` and `]` keys.
- Command palette (Ctrl/Cmd+K), light/dark/system theme, collapsible sidebar, mobile drawer and compact contents menu.
- Accessibility: semantic landmarks and headings, skip link, visible focus, labelled controls, `aria-current` / `aria-pressed` / `aria-selected` states, reduced-motion support, dialogs that trap and return focus, no colour-only status.

## Tests and results

Last run (all green):

| Check                | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| `npm run typecheck`  | clean                                                                           |
| `npm run lint`       | clean                                                                           |
| `npm run validate:content` | 2 files accepted, 10 questions, 0 errors, 0 warnings                      |
| `npm test` (Vitest)  | 7 files, **135 tests passed**                                                   |
| `npm run build`      | succeeds; 10 question pages statically generated                                |
| `npm run test:e2e`   | **62 tests passed** (55 desktop Chrome 1440x900, 7 mobile Pixel 7)              |

Unit tests cover validation, discovery, duplicate detection, normalisation, filtering, search, progress persistence/migration/import, detail rendering, missing optional metadata and the invalid-Mermaid fallback. E2E tests cover the dashboard, browsing, every filter, opening a question, section navigation, all reading modes, bookmarking, marking mastered, persistence across refresh, keyboard navigation, the command palette, diagram controls and a mobile viewport. The e2e tests read the real content from `data/questions` at run time rather than assuming a question count.

### Extensibility test (done)

A temporary question was added as a **new** valid batch file (new ID and sequence, unique search token), with no UI change:

- `validate:content` accepted it (11 questions across 3 files);
- after a rebuild it appeared in the explorer count, was found by search and by the command palette, opened at `/questions/ANG-BEG-011`, was reachable with `]` from the previous question and was counted on the dashboard;
- the entire existing e2e suite (64 tests including the temporary one) still passed with 11 questions loaded.

The temporary file, spec and generated record were removed afterwards and the index rebuilt back to the real 10 questions. (A Vitest integration test, `tests/unit/content/normalization-and-extensibility.test.ts`, keeps this scenario covered permanently.)

## Known limitations

- **Content volume**: only the questions supplied so far are loaded (10 of 600). The app is built for 600, but I did not write curriculum content.
- **ID prefixes**: the schema fixes `ANG-BEG-###` for Beginner. `ANG-INT`, `ANG-ADV` and `ANG-EXP` for the other levels are an assumption (same convention). If your later batches use different prefixes, change `idPrefix` in `src/lib/curriculum.ts`.
- **Field mapping**: the question `topic` field is displayed as the title, and `domain` as the topic area used for filtering and grouping.
- **New content needs a rebuild in production**: question pages are statically generated, so with `next start` you must re-run `npm run build`. In `npm run dev` the watcher handles it.
- **Cache Components are disabled** (`cacheComponents: false`) to keep static generation simple and predictable.
- **Code samples are not executed or verified** by the app; they are displayed as written in the JSON. The same is true for the "verification command" text.
- **Progress is per browser**: `localStorage` only, no sync between devices. Use export/import to move it. Clearing site data clears progress.
- **Search** is client-side over summaries (topic, question text, domain, tags and ID); it does not full-text search inside answer bodies, by design, to keep the client payload small.
- Role/industry/section filters only reflect what is in the loaded data; unknown roles or industries are rejected at validation rather than silently shown.
