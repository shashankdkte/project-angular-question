"use client";

import * as React from "react";
import { ListOrdered, WrapText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/common/copy-button";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export interface CodeBlockFrameProps {
  /** Pre-highlighted, escaped HTML produced by Shiki on the server. */
  html: string;
  /** Raw source, used for copy. Never executed. */
  code: string;
  language: string;
  filename?: string;
  runtime?: string;
  /** "compact" is used for short shell commands: no header, no line numbers. */
  variant?: "full" | "compact";
  label?: string;
  className?: string;
}

export function CodeBlockFrame({
  html,
  code,
  language,
  filename,
  runtime,
  variant = "full",
  label,
  className,
}: CodeBlockFrameProps) {
  const lineNumbers = useUiStore((state) => state.codeLineNumbers);
  const wrap = useUiStore((state) => state.codeWordWrap);
  const setLineNumbers = useUiStore((state) => state.setCodeLineNumbers);
  const setWrap = useUiStore((state) => state.setCodeWordWrap);
  const compact = variant === "compact";

  return (
    <figure
      className={cn("code-block overflow-hidden rounded-lg border bg-muted/40", className)}
      data-line-numbers={!compact && lineNumbers}
      data-wrap={wrap}
    >
      <figcaption className="flex min-h-9 items-center gap-2 border-b bg-muted/60 px-3 py-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          {filename ? (
            <span className="truncate font-mono text-xs font-medium">{filename}</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">{label ?? "Code"}</span>
          )}
          <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] uppercase">
            {language}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!compact && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={lineNumbers}
                    onPressedChange={setLineNumbers}
                    aria-label="Show line numbers"
                    className="h-7 w-7 min-w-7 px-0"
                  >
                    <ListOrdered aria-hidden className="size-3.5" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Line numbers</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={wrap}
                    onPressedChange={setWrap}
                    aria-label="Wrap long lines"
                    className="h-7 w-7 min-w-7 px-0"
                  >
                    <WrapText aria-hidden className="size-3.5" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Word wrap</TooltipContent>
              </Tooltip>
            </>
          )}
          <CopyButton text={code} label="Copy code" />
        </div>
      </figcaption>
      {runtime && !compact && (
        <p className="border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Runtime:</span> {runtime}
        </p>
      )}
      {/* Shiki escapes all source text; this HTML is generated server-side from trusted tooling output. */}
      <div role="region" aria-label={`${filename ?? label ?? "Code"} source`} dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
