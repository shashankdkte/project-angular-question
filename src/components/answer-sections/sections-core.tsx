import { ArrowRight, Check, Lightbulb, Building2, TriangleAlert, Ban, Quote } from "lucide-react";
import type { Answer } from "@/types/content";
import { INDUSTRY_LABELS, labelFor } from "@/lib/curriculum";
import { CopyButton } from "@/components/common/copy-button";
import { Callout, IconList, Label, Prose, RichText, SubHeading } from "./primitives";

/* 1. Definition ----------------------------------------------------------- */
export function DefinitionSection({ data }: { data: Answer["definition"] }) {
  return (
    <div className="relative rounded-lg border border-brand/20 bg-brand-subtle p-5 pr-12">
      <Quote aria-hidden className="mb-2 size-4 text-brand" />
      <blockquote className="text-xl leading-snug font-medium tracking-tight text-balance">
        <RichText text={data.text} />
      </blockquote>
      <div className="absolute top-2 right-2">
        <CopyButton text={data.text} label="Copy definition" />
      </div>
    </div>
  );
}

/* 2. Motivation ----------------------------------------------------------- */
export function MotivationSection({ data }: { data: Answer["motivation"] }) {
  return (
    <div className="space-y-4">
      <Prose>
        <p>
          <RichText text={data.whyIntroduced} />
        </p>
      </Prose>
      {data.historicalNote && (
        <aside className="max-w-prose border-l-2 pl-4">
          <Label className="mb-1">Historical note</Label>
          <p className="text-sm text-muted-foreground italic">
            <RichText text={data.historicalNote} />
          </p>
        </aside>
      )}
    </div>
  );
}

/* 3. Problem solved ------------------------------------------------------- */
export function ProblemSolvedSection({ data }: { data: Answer["problemSolved"] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-warning/30 bg-warning-subtle/70 p-4">
          <Label className="mb-2 text-warning">Before</Label>
          <p className="doc-prose">
            <RichText text={data.before} />
          </p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success-subtle/70 p-4">
          <Label className="mb-2 text-success">After</Label>
          <p className="doc-prose">
            <RichText text={data.after} />
          </p>
        </div>
      </div>
      {data.benefits.length > 0 && (
        <div>
          <SubHeading>Benefits</SubHeading>
          <IconList items={data.benefits} icon={Check} tone="success" />
        </div>
      )}
    </div>
  );
}

/* 4. Characteristics ------------------------------------------------------ */
/** "var: function-scoped" -> lead "var" + rest. Only short, label-like prefixes qualify; text is never dropped. */
export function splitLead(text: string): { lead?: string; rest: string } {
  const match = /^([^:\n]{1,32}):\s+([\s\S]+)$/.exec(text);
  if (match && match[1].trim().split(/\s+/).length <= 3) return { lead: match[1].trim(), rest: match[2] };
  return { rest: text };
}

export function CharacteristicsSection({ data }: { data: Answer["characteristics"] }) {
  return (
    <ol className="max-w-prose divide-y rounded-lg border">
      {data.map((item, index) => {
        const { lead, rest } = splitLead(item);
        return (
          <li key={`${index}-${item.slice(0, 20)}`} className="flex gap-3 px-4 py-3">
            <span aria-hidden className="mt-0.5 w-4 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <p className="doc-prose">
              {lead && <strong className="font-semibold text-foreground">{lead}: </strong>}
              <RichText text={rest} />
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/* 5. Simple analogy ------------------------------------------------------- */
export function SimpleAnalogySection({ data }: { data: Answer["simpleAnalogy"] }) {
  return (
    <figure className="max-w-prose rounded-lg border border-dashed border-brand/40 bg-brand-subtle/50 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb aria-hidden className="size-4 text-brand" />
        <Label className="text-brand">Everyday analogy — not the technical definition</Label>
      </div>
      <figcaption className="mb-1.5 text-base font-semibold tracking-tight">{data.title}</figcaption>
      <p className="doc-prose">
        <RichText text={data.explanation} />
      </p>
    </figure>
  );
}

/* 6. Industry example ----------------------------------------------------- */
export function IndustryExampleSection({ data }: { data: Answer["industryExample"] }) {
  const rows: Array<[string, string]> = [
    ["Scenario", data.scenario],
    ["Implementation", data.implementation],
    ["Business impact", data.businessImpact],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium">
          <Building2 aria-hidden className="size-3.5 text-muted-foreground" />
          {labelFor(INDUSTRY_LABELS, data.industry)}
        </span>
        <span className="text-xs text-muted-foreground">Industry-specific example</span>
      </div>
      <dl className="max-w-prose space-y-4">
        {rows.map(([term, description]) => (
          <div key={term}>
            <dt>
              <Label>{term}</Label>
            </dt>
            <dd className="doc-prose mt-1">
              <RichText text={description} />
            </dd>
          </div>
        ))}
      </dl>
      {data.importantConstraint && (
        <Callout tone="warning" icon={TriangleAlert} title="Important constraint" className="max-w-prose">
          <RichText text={data.importantConstraint} />
        </Callout>
      )}
    </div>
  );
}

/* 7. Use cases ------------------------------------------------------------ */
export function UseCasesSection({ data }: { data: Answer["useCases"] }) {
  return <IconList items={data} icon={ArrowRight} tone="brand" className="max-w-prose" />;
}

/* 11. Pitfalls ------------------------------------------------------------ */
export function PitfallsSection({ data }: { data: Answer["pitfalls"] }) {
  return (
    <div className="max-w-prose rounded-lg border border-warning/30 bg-warning-subtle/60 p-4">
      <IconList items={data} icon={TriangleAlert} tone="warning" />
    </div>
  );
}

/* 12. When not to use ----------------------------------------------------- */
export function WhenNotToUseSection({ data }: { data: Answer["whenNotToUse"] }) {
  return (
    <div className="max-w-prose rounded-lg border border-destructive/25 bg-destructive/5 p-4">
      <Label className="mb-2 text-destructive">Anti-patterns and unsuitable situations</Label>
      <IconList items={data} icon={Ban} tone="danger" />
    </div>
  );
}
