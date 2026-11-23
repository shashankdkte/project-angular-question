import { Breadcrumbs } from "@/components/common/page";
import { DifficultyBadge, PriorityBadge, TypeBadge } from "@/components/common/badges";
import { RichText } from "@/components/answer-sections/primitives";
import {
  DIFFICULTY_META,
  INDUSTRIES,
  INDUSTRY_LABELS,
  ROLES,
  ROLE_LABELS,
  labelFor,
} from "@/lib/curriculum";
import type { QuestionRecord } from "@/types/content";

function Applicability({ label, values, vocabulary, labels }: { label: string; values: string[]; vocabulary: readonly string[]; labels: Record<string, string> }) {
  const all = vocabulary.every((value) => values.includes(value));
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground/80">
        {all
          ? `All ${vocabulary.length}`
          : values.length === 0
            ? "—"
            : values.map((value) => labelFor(labels, value)).join(", ")}
      </dd>
    </div>
  );
}

export function QuestionHeader({ question }: { question: QuestionRecord }) {
  const showFullQuestion = question.question.trim().replace(/\?$/, "") !== question.topic.trim().replace(/\?$/, "");

  return (
    <header className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Questions", href: "/questions" },
          { label: DIFFICULTY_META[question.difficulty].label, href: `/levels/${question.difficulty}` },
          { label: question.id },
        ]}
      />

      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground/80" data-testid="question-id">
            {question.id}
          </span>
          <span aria-hidden>·</span>
          <span>{question.domain}</span>
        </p>
        <h1 id="question-title" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {question.topic}
        </h1>
        {showFullQuestion && (
          <p className="max-w-prose border-l-2 pl-4 text-[15px] leading-relaxed text-muted-foreground">
            <RichText text={question.question} />
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={question.difficulty} />
        <TypeBadge type={question.questionType} />
        <PriorityBadge priority={question.priority} />
      </div>

      <dl className="space-y-1.5">
        <Applicability label="Roles" values={question.roles} vocabulary={ROLES} labels={ROLE_LABELS} />
        <Applicability label="Industries" values={question.industries} vocabulary={INDUSTRIES} labels={INDUSTRY_LABELS} />
        {question.tags.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <dt className="font-medium text-muted-foreground">Tags</dt>
            <dd className="flex flex-wrap gap-1.5">
              {question.tags.map((tag) => (
                <span key={tag} className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="quick-answer" className="rounded-lg border bg-muted/30 p-4">
        <h2 id="quick-answer" className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Quick answer
        </h2>
        <p className="text-[15px] leading-relaxed font-medium">
          <RichText text={question.answer.definition.text} />
        </p>
      </section>
    </header>
  );
}
