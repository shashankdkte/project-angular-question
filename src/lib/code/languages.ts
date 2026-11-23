/**
 * Languages the code renderer highlights. Kept as plain data so the content
 * validator can warn about unknown languages without loading Shiki.
 */

export const SUPPORTED_CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "html",
  "css",
  "scss",
  "bash",
  "shell",
  "yaml",
  "sql",
  "markdown",
  "diff",
  "text",
] as const;

export type SupportedCodeLanguage = (typeof SUPPORTED_CODE_LANGUAGES)[number];

const ALIASES: Record<string, SupportedCodeLanguage> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shellscript: "bash",
  zsh: "bash",
  console: "shell",
  yml: "yaml",
  md: "markdown",
  plaintext: "text",
  txt: "text",
  plain: "text",
};

/** Resolve a language label from content to a supported Shiki language (or "text"). */
export function resolveCodeLanguage(label: string | undefined): SupportedCodeLanguage {
  const normalized = (label ?? "").trim().toLowerCase();
  if ((SUPPORTED_CODE_LANGUAGES as readonly string[]).includes(normalized)) {
    return normalized as SupportedCodeLanguage;
  }
  return ALIASES[normalized] ?? "text";
}

export function isKnownCodeLanguage(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (SUPPORTED_CODE_LANGUAGES as readonly string[]).includes(normalized) || normalized in ALIASES;
}
