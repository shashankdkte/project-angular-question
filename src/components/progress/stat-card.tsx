import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  /** Pass null while a figure is not yet known (e.g. before stored progress loads). */
  value: React.ReactNode | null;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value ?? <span aria-label="loading" className="text-muted-foreground/60">–</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
