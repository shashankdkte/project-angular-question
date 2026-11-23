"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts / older browsers.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** Show the label next to the icon. */
  showLabel?: boolean;
}

export function CopyButton({
  text,
  label = "Copy",
  className,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
}: CopyButtonProps) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await writeClipboard(text);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  };

  const Icon = state === "copied" ? Check : Copy;
  const current = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={showLabel ? "sm" : size}
            onClick={onClick}
            aria-label={showLabel ? undefined : label}
            className={cn(state === "copied" && "text-success", className)}
          >
            <Icon aria-hidden />
            {showLabel && <span>{current}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{current}</TooltipContent>
      </Tooltip>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "idle" ? "" : current}
      </span>
    </>
  );
}
