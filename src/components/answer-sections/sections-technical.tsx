import { CheckCircle2, CircleDashed, FlaskConical, ShieldAlert, ClipboardList, ScrollText } from "lucide-react";
import type { Answer } from "@/types/content";
import { CodeBlock } from "@/components/code/code-block";
import { MermaidDiagram } from "@/components/diagrams/mermaid-diagram";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FOLLOW_UP_LEVELS } from "@/lib/schemas/answer";
import { DIFFICULTY_META } from "@/lib/curriculum";
import { Callout, CellValue, IconList, Label, RichText, SubHeading, columnLabel, unionKeys } from "./primitives";

/* 8. End-to-end flow ------------------------------------------------------ */
export function EndToEndFlowSection({ data }: { data: Answer["endToEndFlow"] }) {
  return (
    <div className="space-y-6">
      {data.steps.length > 0 && (
        <ol className="max-w-prose" aria-label="Step-by-step flow">
          {data.steps.map((step, index) => (
            <li
              key={`${index}-${step.slice(0, 20)}`}
              className="relative flex gap-3 pb-4 last:pb-0 not-last:before:absolute not-last:before:top-7 not-last:before:bottom-0 not-last:before:left-3 not-last:before:w-px not-last:before:bg-border"
            >
              <span
                aria-hidden
                className="relative flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums"
              >
                {index + 1}
              </span>
              <p className="doc-prose pt-px">
                <span className="sr-only">Step {index + 1}: </span>
                <RichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      )}
      {data.diagrams.length > 0 && (
        <div className="space-y-6">
          {data.diagrams.map((diagram) => (
            <MermaidDiagram
              key={diagram.id}
              id={diagram.id}
              source={diagram.mermaid}
              title={diagram.title}
              description={diagram.caption}
            />
          ))}
        </div>
      )}
      {data.steps.length === 0 && data.diagrams.length === 0 && (
        <p className="text-sm text-muted-foreground">No flow steps or diagrams were provided for this question.</p>
      )}
    </div>
  );
}

/* 9. Code example --------------------------------------------------------- */
export function CodeExampleSection({ data }: { data: Answer["codeExample"] }) {
  return (
    <div className="space-y-4">
      <CodeBlock code={data.code} language={data.language} filename={data.filename} runtime={data.runtime} />
      <p className="text-xs text-muted-foreground">Displayed for reading only. Code from the content files is never executed by this site.</p>
      {data.explanation.length > 0 && (
        <div>
          <SubHeading>What to notice</SubHeading>
          <IconList items={data.explanation} icon={CheckCircle2} tone="brand" className="max-w-prose" />
        </div>
      )}
    </div>
  );
}

/* 10. Project experience -------------------------------------------------- */
export function ProjectExperienceSection({ data }: { data: Answer["projectExperience"] }) {
  const verified = data.status === "verified";
  const hypothetical = data.status === "hypothetical";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {verified ? (
          <Badge className="bg-success-subtle text-success border-success/30" variant="outline">
            <CheckCircle2 aria-hidden /> Verified experience
          </Badge>
        ) : (
          <Badge variant="outline" className="border-dashed">
            <CircleDashed aria-hidden /> {hypothetical ? "Hypothetical" : `Unverified (${data.status})`}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {verified ? "Describes work that was actually completed." : "A suggested implementation, not experience you already have."}
        </span>
      </div>

      <div className={verified ? "max-w-prose rounded-lg border p-4" : "max-w-prose rounded-lg border border-dashed p-4"}>
        <Label className="mb-1.5">{verified ? "What was built" : "How you could apply this (hypothetical)"}</Label>
        <p className="doc-prose">
          <RichText text={data.example} />
        </p>
      </div>

      {data.evidenceToCollect.length > 0 && (
        <div>
          <SubHeading>Evidence to collect once you have built it</SubHeading>
          <ul className="max-w-prose space-y-2">
            {data.evidenceToCollect.map((item, index) => (
              <li key={`${index}-${item.slice(0, 20)}`} className="flex gap-2.5">
                <ClipboardList aria-hidden className="mt-[0.4rem] size-3.5 shrink-0 text-muted-foreground" />
                <span className="doc-prose">
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.doNotClaim && (
        <Callout tone="danger" icon={ShieldAlert} title="Do not claim" className="max-w-prose">
          <RichText text={data.doNotClaim} />
        </Callout>
      )}
    </div>
  );
}

/* 13. Alternatives -------------------------------------------------------- */
export function AlternativesSection({ data }: { data: Answer["alternatives"] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No alternatives were listed.</p>;
  const rows = data as Array<Record<string, unknown> & { name: string }>;
  // Columns come from the keys actually present; alternatives are not assumed to share a shape.
  const columns = unionKeys(rows, ["name"]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[32rem]">
        <TableCaption className="sr-only">Alternatives with their appropriate contexts and trade-offs</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-1/4">
              Alternative
            </TableHead>
            {columns.map((key) => (
              <TableHead key={key} scope="col">
                {columnLabel(key)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.name}-${index}`}>
              <TableCell scope="row" className="align-top font-medium whitespace-normal">
                <RichText text={row.name} />
              </TableCell>
              {columns.map((key) => (
                <TableCell key={key} className="doc-prose align-top whitespace-normal">
                  <CellValue value={row[key]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* 14. Testing ------------------------------------------------------------- */
export function TestingSection({ data }: { data: Answer["testing"] }) {
  const cases = data.testCases as Array<Record<string, unknown>>;
  const caseColumns = unionKeys(cases);
  const command = data.verificationCommand.join("\n");

  return (
    <div className="space-y-6">
      <div className="flex max-w-prose gap-2.5">
        <FlaskConical aria-hidden className="mt-1 size-4 shrink-0 text-brand" />
        <div>
          <Label className="mb-1">Testing strategy</Label>
          <p className="doc-prose">
            <RichText text={data.strategy} />
          </p>
        </div>
      </div>

      {cases.length > 0 && (
        <div>
          <SubHeading>Positive test cases</SubHeading>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[28rem]">
              <TableCaption className="sr-only">Positive test cases and expected results</TableCaption>
              <TableHeader>
                <TableRow>
                  {caseColumns.map((key) => (
                    <TableHead key={key} scope="col">
                      {columnLabel(key)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((row, index) => (
                  <TableRow key={index}>
                    {caseColumns.map((key, column) => (
                      <TableCell key={key} className={column === 0 ? "align-top font-medium whitespace-normal" : "doc-prose align-top whitespace-normal"}>
                        <CellValue value={row[key]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {data.negativeCases.length > 0 && (
        <div>
          <SubHeading>Negative cases (should be rejected or fail)</SubHeading>
          <IconList items={data.negativeCases} icon={ShieldAlert} tone="danger" className="max-w-prose" />
        </div>
      )}

      {command && (
        <div>
          <SubHeading>{data.verificationCommand.length > 1 ? "Verification commands" : "Verification command"}</SubHeading>
          <CodeBlock code={command} language="bash" variant="compact" label="Shell" />
        </div>
      )}
    </div>
  );
}

/* 15. Follow-up questions ------------------------------------------------- */
export function FollowUpsSection({ data }: { data: Answer["followUps"] }) {
  const levels = FOLLOW_UP_LEVELS.map((level) => ({ level, items: data[level] }));
  const firstWithQuestions = levels.find((entry) => entry.items.length > 0)?.level ?? "beginner";

  return (
    <Tabs defaultValue={firstWithQuestions}>
      <TabsList className="h-auto max-w-full flex-wrap justify-start">
        {levels.map(({ level, items }) => (
          <TabsTrigger key={level} value={level} className="px-3">
            {DIFFICULTY_META[level].label}
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">{items.length}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {levels.map(({ level, items }) => (
        <TabsContent key={level} value={level} className="pt-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {DIFFICULTY_META[level].label.toLowerCase()} follow-up questions were provided.</p>
          ) : (
            <ol className="max-w-prose space-y-3">
              {items.map((item, index) => (
                <li key={`${index}-${item.slice(0, 20)}`} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 w-4 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="doc-prose">
                    <RichText text={item} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* Closing material -------------------------------------------------------- */
export function FinalTakeaway({ text }: { text: string }) {
  return (
    <section aria-labelledby="final-takeaway" className="rounded-lg border border-brand/25 bg-brand-subtle p-5">
      <Label id="final-takeaway" className="mb-2 text-brand">
        Final takeaway
      </Label>
      <p className="text-lg leading-snug font-medium tracking-tight text-balance">
        <RichText text={text} />
      </p>
    </section>
  );
}

export function LearningOutcomes({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="learning-outcomes">
      <h2 id="learning-outcomes" className="mb-2 text-sm font-semibold tracking-tight">
        Learning outcomes
      </h2>
      <IconList items={items} icon={CheckCircle2} tone="success" className="max-w-prose" />
    </section>
  );
}

export function SourceNotes({ notes }: { notes: Record<string, unknown> }) {
  const entries = Object.entries(notes).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;
  const unverified = notes.verifiedAgainstRuntime === false;

  return (
    <aside aria-label="Source notes" className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground/80">
        <ScrollText aria-hidden className="size-3.5" /> Source notes
      </div>
      <ul className="space-y-1">
        {typeof notes.status === "string" && <li>Content status: {notes.status.replace(/-/g, " ")}</li>}
        {unverified && <li>The code examples have not been verified against a runtime. Run them before relying on them.</li>}
        {notes.verifiedAgainstRuntime === true && <li>Code examples were verified against a runtime.</li>}
        {notes.frameworkSpecific === false && <li>Framework-agnostic concept (not specific to Angular).</li>}
        {notes.frameworkSpecific === true && <li>Framework-specific concept.</li>}
        {entries
          .filter(([key]) => !["status", "verifiedAgainstRuntime", "frameworkSpecific"].includes(key))
          .map(([key, value]) => (
            <li key={key}>
              {columnLabel(key)}: <CellValue value={value} />
            </li>
          ))}
      </ul>
    </aside>
  );
}
