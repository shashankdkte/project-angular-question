/**
 * Pure helpers shared by the content validator (Node) and <MermaidDiagram />
 * (browser). No Mermaid import here, so they are cheap and testable.
 */

export const MERMAID_DIAGRAM_KEYWORDS = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "stateDiagram-v2",
  "stateDiagram",
  "erDiagram",
  "classDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "C4Context",
  "C4Container",
  "C4Component",
  "C4Dynamic",
  "C4Deployment",
  "block-beta",
  "block",
  "architecture-beta",
  "architecture",
  "sankey-beta",
  "xychart-beta",
  "packet-beta",
  "kanban",
  "radar-beta",
] as const;

/** Strip YAML front matter and `%%` comment lines, returning the meaningful lines. */
function meaningfulLines(source: string): string[] {
  let text = source.replace(/^\uFEFF/, "");
  const frontMatter = /^\s*---\s*\n[\s\S]*?\n---\s*\n/;
  text = text.replace(frontMatter, "");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));
}

/** Returns the Mermaid diagram keyword (e.g. "flowchart", "sequenceDiagram") or null. */
export function detectDiagramKind(source: string): string | null {
  const [first] = meaningfulLines(source);
  if (!first) return null;
  const token = first.split(/[\s;]/)[0] ?? "";
  const match = MERMAID_DIAGRAM_KEYWORDS.find((keyword) => token === keyword);
  return match ?? null;
}

const UNSAFE_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /^\s*click\s/im, reason: "interactive `click` directives are not allowed" },
  { pattern: /javascript\s*:/i, reason: "`javascript:` links are not allowed" },
  { pattern: /<\s*(script|iframe|object|embed|img|a|svg|style|link|meta|form)\b/i, reason: "embedded HTML elements are not allowed" },
  { pattern: /\bon(click|error|load|mouseover|focus)\s*=/i, reason: "inline event handlers are not allowed" },
  { pattern: /%%\s*\{/, reason: "`%%{ }%%` configuration directives are not allowed" },
];

/**
 * Detects constructs the platform refuses to render. The renderer also runs
 * with `securityLevel: "strict"`; this is defence in depth and gives learners
 * a precise explanation instead of an opaque failure.
 */
export function findUnsafeConstruct(source: string): string | null {
  for (const { pattern, reason } of UNSAFE_PATTERNS) {
    if (pattern.test(source)) return reason;
  }
  return null;
}
