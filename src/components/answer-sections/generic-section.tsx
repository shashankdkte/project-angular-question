import * as React from "react";
import { humanize } from "@/lib/curriculum";
import { RichText } from "./primitives";

/**
 * Readable fallback for content the dedicated renderers do not know about:
 * unknown answer sections added by a future schema, and unknown extra fields
 * inside known sections. Nothing from the source JSON is silently dropped.
 */
export function GenericValue({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return (
      <p className="doc-prose">
        <RichText text={value} />
      </p>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") return <p className="doc-prose">{String(value)}</p>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {value.map((item, index) => (
          <li key={index} className="doc-prose">
            {typeof item === "string" ? <RichText text={item} /> : <GenericValue value={item} depth={depth + 1} />}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className="space-y-3">
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div key={key}>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{humanize(key)}</dt>
            <dd className="mt-1">
              <GenericValue value={entry} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export function GenericSection({ data }: { data: unknown }) {
  return <GenericValue value={data} />;
}

export function AdditionalDetails({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-5 rounded-lg border border-dashed p-4" data-testid="additional-details">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Additional details</p>
      <GenericValue value={data} />
    </div>
  );
}
