import type { ContentReport, ValidationIssue } from "../../types/content";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const red = paint(31);
const yellow = paint(33);
const green = paint(32);
const dim = paint(2);
const bold = paint(1);

function formatIssue(issue: ValidationIssue): string {
  const tag = issue.severity === "error" ? red("error  ") : yellow("warning");
  const where = [issue.questionId, issue.path].filter(Boolean).join(" ");
  return `  ${tag} ${dim(`[${issue.code}]`)} ${issue.message}${where ? dim(`  (${where})`) : ""}`;
}

export interface FormatOptions {
  /** Show warnings (default true). */
  warnings?: boolean;
}

export function formatReport(report: ContentReport, options: FormatOptions = {}): string {
  const showWarnings = options.warnings !== false;
  const lines: string[] = [];

  lines.push(bold("Content validation"));
  lines.push(
    dim(
      `  ${report.filesDiscovered} file(s) discovered, ${report.filesAccepted} accepted, ${report.filesRejected} rejected, ${report.questionsAccepted} question(s) loaded`,
    ),
  );

  const byFile = new Map<string, ValidationIssue[]>();
  for (const issue of report.issues) {
    if (issue.severity === "warning" && !showWarnings) continue;
    byFile.set(issue.file, [...(byFile.get(issue.file) ?? []), issue]);
  }

  for (const file of report.files) {
    const fileIssues = byFile.get(file.file) ?? [];
    const hasError = fileIssues.some((i) => i.severity === "error");
    const status = !file.accepted ? red("REJECTED") : fileIssues.length ? yellow("OK (warnings)") : green("OK");
    lines.push("");
    lines.push(`${bold(file.file)}  ${status}  ${dim(`${file.questionCount} question(s)`)}`);
    for (const issue of fileIssues) lines.push(formatIssue(issue));
    byFile.delete(file.file);
    if (hasError && !file.accepted) continue;
  }
  // Issues in files that are not in the report (e.g. project files).
  for (const [file, fileIssues] of byFile) {
    lines.push("");
    lines.push(bold(file));
    for (const issue of fileIssues) lines.push(formatIssue(issue));
  }

  lines.push("");
  const summary = `${report.errors} error(s), ${report.warnings} warning(s)`;
  lines.push(report.errors > 0 ? red(`✖ ${summary}`) : green(`✔ ${summary}`));
  return lines.join("\n");
}
