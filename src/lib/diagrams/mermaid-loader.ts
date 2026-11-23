import { findUnsafeConstruct } from "./mermaid-safety";

/**
 * Browser-only, lazy Mermaid access.
 *
 *  - Mermaid is loaded with a dynamic import the first time a diagram needs
 *    rendering; it is never imported on the server and never initialised
 *    globally at module load.
 *  - Rendering is serialised through a queue: Mermaid keeps global state, so
 *    concurrent `render` calls on one page would interfere with each other.
 *  - Strict security: `securityLevel: "strict"`, no HTML labels, no click
 *    handlers, no config directives (see mermaid-safety.ts).
 */

type MermaidApi = (typeof import("mermaid"))["default"];

export type DiagramTheme = "light" | "dark";

export class DiagramBlockedError extends Error {
  constructor(reason: string) {
    super(`This diagram was not rendered for safety: ${reason}.`);
    this.name = "DiagramBlockedError";
  }
}

let mermaidPromise: Promise<MermaidApi> | null = null;

export function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import("mermaid").then((module) => module.default);
  return mermaidPromise;
}

let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

function configFor(theme: DiagramTheme) {
  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    theme: theme === "dark" ? ("dark" as const) : ("neutral" as const),
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    htmlLabels: false,
    logLevel: "fatal" as const,
    suppressErrorRendering: true,
    maxTextSize: 20_000,
    flowchart: { htmlLabels: false, useMaxWidth: false, curve: "basis" as const },
    sequence: { useMaxWidth: false },
    er: { useMaxWidth: false },
    class: { useMaxWidth: false },
    state: { useMaxWidth: false },
  };
}

export interface RenderedDiagram {
  svg: string;
}

/** Validates, then renders, one diagram. Rejects with a readable error; never throws synchronously. */
export function renderMermaid(source: string, theme: DiagramTheme): Promise<RenderedDiagram> {
  const run = async (): Promise<RenderedDiagram> => {
    const unsafe = findUnsafeConstruct(source);
    if (unsafe) throw new DiagramBlockedError(unsafe);

    const mermaid = await loadMermaid();
    mermaid.initialize(configFor(theme));
    await mermaid.parse(source); // throws a descriptive syntax error for invalid diagrams

    const id = `mermaid-diagram-${++counter}`;
    try {
      const { svg } = await mermaid.render(id, source);
      return { svg };
    } finally {
      // Mermaid may leave its temporary container in <body> after a failure.
      document.getElementById(`d${id}`)?.remove();
      document.getElementById(id)?.remove();
    }
  };

  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

/** Defence in depth before offering a download: refuse anything script-like in the generated SVG. */
export function isSvgSafeToDownload(svg: string): boolean {
  return !/<script|javascript:|\son[a-z]+\s*=|<foreignObject/i.test(svg);
}

export function friendlyMermaidError(error: unknown): string {
  if (error instanceof DiagramBlockedError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  // Mermaid parse errors are multi-line with a caret diagram; keep the first informative lines.
  return message.split("\n").slice(0, 4).join("\n").trim() || "Unknown rendering error";
}
