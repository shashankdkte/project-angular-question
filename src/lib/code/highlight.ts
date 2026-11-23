import "server-only";
import { createHighlighter, type Highlighter } from "shiki";
import { SUPPORTED_CODE_LANGUAGES, resolveCodeLanguage } from "./languages";

/**
 * Server-side syntax highlighting.
 *
 * Highlighting runs while rendering Server Components (at build time for
 * statically generated question pages), so Shiki and its grammars never ship
 * to the browser. Output uses CSS variables for both themes, so switching
 * light/dark needs no re-highlighting.
 */

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [LIGHT_THEME, DARK_THEME],
    langs: SUPPORTED_CODE_LANGUAGES.filter((language) => language !== "text"),
  });
  return highlighterPromise;
}

/** Returns Shiki's escaped `<pre class="shiki">…</pre>` HTML. Code content is escaped by Shiki. */
export async function highlightCode(code: string, languageLabel: string | undefined): Promise<string> {
  const highlighter = await getHighlighter();
  const lang = resolveCodeLanguage(languageLabel);
  return highlighter.codeToHtml(code.replace(/\n$/, ""), {
    lang,
    themes: { light: LIGHT_THEME, dark: DARK_THEME },
    defaultColor: false,
  });
}
