"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/common/copy-button";
import {
  friendlyMermaidError,
  isSvgSafeToDownload,
  renderMermaid,
  type DiagramTheme,
} from "@/lib/diagrams/mermaid-loader";
import { DiagramViewport } from "./diagram-viewport";

export interface MermaidDiagramProps {
  /** Mermaid source from the content JSON. Treated as untrusted. */
  source: string;
  title: string;
  /** Plain-text description (the JSON `caption`); shown and used as the accessible description. */
  description?: string;
  /** Diagram id from the content, used for the download filename. */
  id?: string;
}

type RenderState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "ready"; svg: string }
  | { status: "error"; message: string };

/** Resolves true once the element is near the viewport (or immediately without IntersectionObserver). */
function useNearViewport(ref: React.RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // No lazy-loading support: render straight away (deferred so it isn't a synchronous state update in the effect).
      const timer = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return near;
}

function DiagramFallback({ source, title, description, message }: { source: string; title: string; description?: string; message: string }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning-subtle p-4" role="status" data-testid="diagram-fallback">
      <div className="flex items-start gap-2.5">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-medium">The diagram “{title}” could not be displayed.</p>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{message}</pre>
          {description && (
            <p>
              <span className="font-medium">Description: </span>
              {description}
            </p>
          )}
        </div>
      </div>
      <details className="mt-3 rounded-md border bg-background/60">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium">Show Mermaid source</summary>
        <div className="relative border-t">
          <div className="absolute top-1 right-1">
            <CopyButton text={source} label="Copy Mermaid source" />
          </div>
          <pre tabIndex={0} className="overflow-x-auto p-3 pr-12 font-mono text-xs leading-relaxed">
            {source}
          </pre>
        </div>
      </details>
    </div>
  );
}

class DiagramErrorBoundary extends React.Component<
  { fallback: (message: string) => React.ReactNode; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? this.props.fallback(friendlyMermaidError(this.state.error)) : this.props.children;
  }
}

function MermaidDiagramInner({ source, title, description, id }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const theme: DiagramTheme = resolvedTheme === "dark" ? "dark" : "light";
  const wrapperRef = React.useRef<HTMLElement>(null);
  const near = useNearViewport(wrapperRef);
  const [state, setState] = React.useState<RenderState>({ status: "idle" });
  const [fullscreen, setFullscreen] = React.useState(false);
  const fullscreenButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!near) return;
    let cancelled = false;
    renderMermaid(source, theme).then(
      ({ svg }) => !cancelled && setState({ status: "ready", svg }),
      (error: unknown) => !cancelled && setState({ status: "error", message: friendlyMermaidError(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [near, source, theme]);

  const downloadable = state.status === "ready" && isSvgSafeToDownload(state.svg);

  const download = () => {
    if (state.status !== "ready" || !downloadable) return;
    const blob = new Blob([state.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(id ?? title).replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const actions = (
    <>
      <CopyButton text={source} label="Copy Mermaid source" />
      {downloadable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Download SVG" onClick={download}>
              <Download aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download SVG</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <figure ref={wrapperRef} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="space-y-2" data-testid="mermaid-diagram">
      <figcaption className="space-y-0.5">
        <p id={titleId} className="text-sm font-medium">
          {title}
        </p>
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </figcaption>

      {(state.status === "idle" || state.status === "rendering") && (
        <div aria-busy="true" aria-label={`Rendering diagram: ${title}`} className="rounded-lg border p-4">
          <Skeleton className="h-52 w-full" />
        </div>
      )}

      {state.status === "error" && <DiagramFallback source={source} title={title} description={description} message={state.message} />}

      {state.status === "ready" && (
        <>
          <DiagramViewport
            svg={state.svg}
            label={title}
            actions={
              <>
                {actions}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      ref={fullscreenButtonRef}
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open diagram full screen"
                      onClick={() => setFullscreen(true)}
                    >
                      <Maximize2 aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Full screen</TooltipContent>
                </Tooltip>
              </>
            }
          />
          <Dialog open={fullscreen} onOpenChange={setFullscreen}>
            <DialogContent
              className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-3 sm:max-w-[96vw]"
              // Focus the dialog itself rather than its first toolbar button: that button's tooltip would
              // open on focus and swallow the first Escape press.
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                (event.currentTarget as HTMLElement).focus();
              }}
              // The dialog is controlled (no DialogTrigger), so return focus to the opening button ourselves.
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                fullscreenButtonRef.current?.focus();
              }}
            >
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description ?? "Mermaid diagram. Use the toolbar to zoom, then scroll to pan."}</DialogDescription>
              </DialogHeader>
              <DiagramViewport svg={state.svg} label={title} className="min-h-0 flex-1" viewportClassName="max-h-none h-full" actions={actions} />
            </DialogContent>
          </Dialog>
          <details className="text-xs">
            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">Mermaid source</summary>
            <pre tabIndex={0} className="mt-2 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono leading-relaxed">
              {source}
            </pre>
          </details>
        </>
      )}
    </figure>
  );
}

/**
 * Production diagram viewer. Lazy (Mermaid loads only when the diagram is
 * near the viewport), strict-security, theme aware, and isolated by an error
 * boundary so a bad diagram can never take down the question page.
 */
export function MermaidDiagram(props: MermaidDiagramProps) {
  return (
    <DiagramErrorBoundary
      fallback={(message) => (
        <DiagramFallback source={props.source} title={props.title} description={props.description} message={message} />
      )}
    >
      <MermaidDiagramInner {...props} />
    </DiagramErrorBoundary>
  );
}
