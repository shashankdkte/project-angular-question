/**
 * npm run content:build
 *
 * Discovers, validates and normalises all question batches, then writes:
 *   generated/index.json              lightweight index of every question
 *   generated/questions/<id>.json     full per-question record (loaded on demand)
 *   generated/projects.json           validated project metadata
 *   generated/report.json             validation report
 *   public/content/index.json         static copy of the index for the browser
 *
 * Invalid batches are excluded from the output and reported. By default the
 * process exits 1 when any error exists (so a production build fails loudly).
 *
 * Flags:
 *   --allow-errors   write valid content and exit 0 even if some files are invalid
 *                    (used by the dev watcher so a typo never stops the dev server)
 *   --quiet          only print the summary line
 */
import { ingestContent } from "../src/lib/content/ingest";
import { writeArtifacts } from "../src/lib/content/artifacts";
import { resolveContentPaths } from "../src/lib/content/paths";
import { formatReport } from "../src/lib/content/report-format";

export async function buildContent(options: { quiet?: boolean } = {}) {
  const paths = resolveContentPaths();
  const result = await ingestContent(paths);
  await writeArtifacts(result, paths);

  if (options.quiet) {
    const { questionsAccepted, filesAccepted, errors, warnings } = result.report;
    console.log(`[content] ${questionsAccepted} question(s) from ${filesAccepted} file(s) - ${errors} error(s), ${warnings} warning(s)`);
    if (errors > 0) console.log(formatReport({ ...result.report, issues: result.report.issues.filter((i) => i.severity === "error") }, { warnings: false }));
  } else {
    console.log(formatReport(result.report));
    console.log(`\nWrote ${result.report.questionsAccepted} question record(s) to generated/ and public/content/index.json`);
  }
  return result;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const result = await buildContent({ quiet: args.has("--quiet") });
  if (result.report.errors > 0 && !args.has("--allow-errors")) process.exit(1);
}

// Run only when executed directly (the dev watcher imports buildContent).
if (process.argv[1] && /build-content-index\.[cm]?[jt]s$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
