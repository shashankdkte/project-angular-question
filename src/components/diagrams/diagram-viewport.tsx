"use client";

import * as React from "react";
import { Minus, Plus, RotateCcw, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STEP = 0.25;
const MAX_FIT_SCALE = 1.25;

interface NaturalSize {
  width: number;
  height: number;
}

function readNaturalSize(svg: SVGSVGElement): NaturalSize | null {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) return { width: viewBox.width, height: viewBox.height };
  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  return width > 0 && height > 0 ? { width, height } : null;
}

interface DiagramViewportProps {
  /** Sanitised SVG markup produced by Mermaid (strict security level). */
  svg: string;
  label: string;
  className?: string;
  viewportClassName?: string;
  /** Extra toolbar actions (copy source, download, full screen…). */
  actions?: React.ReactNode;
}

function ToolbarButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Scrollable SVG viewer with zoom in/out, reset and fit-to-container. */
export function DiagramViewport({ svg, label, className, viewportClassName, actions }: DiagramViewportProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const natural = React.useRef<NaturalSize | null>(null);
  const [scale, setScale] = React.useState(1);

  const fit = React.useCallback(() => {
    const container = containerRef.current;
    if (!container || !natural.current) return;
    const available = container.clientWidth - 32;
    const next = Math.min(MAX_FIT_SCALE, Math.max(MIN_SCALE, available / natural.current.width));
    setScale(Number.isFinite(next) ? Math.round(next * 100) / 100 : 1);
  }, []);

  const applyScale = React.useCallback((value: number) => {
    const element = containerRef.current?.querySelector("svg");
    if (!element || !natural.current) return;
    element.style.maxWidth = "none";
    element.style.width = `${Math.round(natural.current.width * value)}px`;
    element.style.height = "auto";
    element.removeAttribute("height");
  }, []);

  // New SVG: measure natural size, then start "fit" (or 100% if it already fits).
  React.useEffect(() => {
    const element = containerRef.current?.querySelector("svg");
    if (!element) return;
    natural.current = readNaturalSize(element);
    if (!natural.current) return;
    const available = (containerRef.current?.clientWidth ?? 0) - 32;
    const initial = natural.current.width > available ? Math.max(MIN_SCALE, available / natural.current.width) : 1;
    setScale(Math.round(initial * 100) / 100);
    applyScale(initial);
  }, [svg, applyScale]);

  React.useEffect(() => {
    applyScale(scale);
  }, [scale, applyScale]);

  const zoomBy = (delta: number) => setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((current + delta) * 100) / 100)));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomBy(-STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      setScale(1);
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1" role="toolbar" aria-label={`${label} controls`}>
        <ToolbarButton label="Zoom out" onClick={() => zoomBy(-STEP)} disabled={scale <= MIN_SCALE}>
          <Minus aria-hidden />
        </ToolbarButton>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite" data-testid="diagram-zoom">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarButton label="Zoom in" onClick={() => zoomBy(STEP)} disabled={scale >= MAX_SCALE}>
          <Plus aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Reset zoom to 100%" onClick={() => setScale(1)}>
          <RotateCcw aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Fit to container" onClick={fit}>
          <ScanSearch aria-hidden />
        </ToolbarButton>
        {actions && <div className="ml-auto flex items-center gap-0.5">{actions}</div>}
      </div>
      <div
        ref={containerRef}
        role="region"
        aria-label={`${label} (scrollable diagram)`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn("diagram-svg max-h-[70vh] overflow-auto p-4 focus-visible:outline-offset-[-2px]", viewportClassName)}
        // The SVG is generated by Mermaid with securityLevel "strict" (sanitised) from source we also pre-screen.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
