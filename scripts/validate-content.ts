/**
 * npm run validate:content
 *
 * Validates every JSON file under data/questions (and data/projects) against
 * the canonical schema plus semantic and quality rules. Writes nothing.
 *
 * Flags:
 *   --strict        treat warnings as errors (exit 1)
 *   --no-warnings   hide warnings in the output
 *   --json          print the machine-readable report instead of text
 */
import { ingestContent } from "../src/lib/content/ingest";
import { resolveContentPaths } from "../src/lib/content/paths";
import { formatReport } from "../src/lib/content/report-format";

async function main() {
  const args = new Set(process.argv.slice(2));
  const paths = resolveContentPaths();
  const result = await ingestContent(paths);

  if (args.has("--json")) {
    console.log(JSON.stringify(result.report, null, 2));
  } else {
    console.log(formatReport(result.report, { warnings: !args.has("--no-warnings") }));
  }

  const failed = result.report.errors > 0 || (args.has("--strict") && result.report.warnings > 0);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
