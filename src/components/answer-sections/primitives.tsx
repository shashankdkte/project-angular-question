import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Renders text, turning `backtick` spans into inline code. Everything else is plain, escaped text. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={index} className="inline-code">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("doc-prose max-w-prose space-y-3", className)}>{children}</div>;
}

export function Label({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn("text-[11px] font-semibold tracking-wider text-muted-foreground uppercase", className)}>{children}</p>
  );
}

const TONES = {
  neutral: { box: "border bg-muted/40", icon: "text-muted-foreground" },
  brand: { box: "border-brand/25 bg-brand-subtle", icon: "text-brand" },
  warning: { box: "border-warning/35 bg-warning-subtle", icon: "text-warning" },
  danger: { box: "border-destructive/30 bg-destructive/5", icon: "text-destructive" },
  success: { box: "border-success/30 bg-success-subtle", icon: "text-success" },
} as const;

export type Tone = keyof typeof TONES;

export function Callout({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = TONES[tone];
  return (
    <div className={cn("rounded-lg border p-4", styles.box, className)}>
      {(title || Icon) && (
        <div className="mb-1.5 flex items-center gap-2">
          {Icon && <Icon aria-hidden className={cn("size-4 shrink-0", styles.icon)} />}
          {title && <p className="text-sm font-semibold">{title}</p>}
        </div>
      )}
      <div className="doc-prose text-[0.9rem]">{children}</div>
    </div>
  );
}

/** Compact list with a tinted marker icon per item. */
export function IconList({
  items,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  items: string[];
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-2.5">
          <Icon aria-hidden className={cn("mt-[0.4rem] size-3.5 shrink-0", TONES[tone].icon)} />
          <span className="doc-prose">
            <RichText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-sm font-semibold tracking-tight">{children}</h4>;
}

/** Plain-language labels for camelCase keys the schema does not name explicitly. */
export function columnLabel(key: string): string {
  const known: Record<string, string> = {
    bestFor: "Best for",
    tradeoff: "Trade-off",
    tradeoffs: "Trade-offs",
    case: "Case",
    expected: "Expected result",
    whenToUse: "When to use",
  };
  if (known[key]) return known[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Renders any JSON cell value readably, without assuming it is a string. */
export function CellValue({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "string") return <RichText text={value} />;
  if (typeof value === "number" || typeof value === "boolean") return <>{String(value)}</>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((item, index) => (
          <li key={index}>
            <CellValue value={item} />
          </li>
        ))}
      </ul>
    );
  }
  return <code className="inline-code break-all">{JSON.stringify(value)}</code>;
}

/** Ordered union of keys across heterogeneous objects (first-seen order), excluding `skip`. */
export function unionKeys(rows: Array<Record<string, unknown>>, skip: string[] = []): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!skip.includes(key) && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}
