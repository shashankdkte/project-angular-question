import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { QuestionExplorer } from "@/components/explorer/question-explorer";
import { ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/curriculum";
import { loadIndex } from "@/lib/content/load";

type Params = Promise<{ level: string }>;

export function generateStaticParams() {
  return DIFFICULTIES.map((level) => ({ level }));
}

const isDifficulty = (value: string): value is Difficulty => (DIFFICULTIES as readonly string[]).includes(value);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { level } = await params;
  return { title: isDifficulty(level) ? `${DIFFICULTY_META[level].label} questions` : "Level not found" };
}

export default async function LevelPage({ params }: { params: Params }) {
  const { level } = await params;
  if (!isDifficulty(level)) notFound();
  const meta = DIFFICULTY_META[level];

  const index = await loadIndex();
  if (!index) {
    return (
      <PageContainer>
        <PageHeader title={meta.label} />
        <ContentUnavailable />
      </PageContainer>
    );
  }

  const questions = index.questions.filter((question) => question.difficulty === level);

  return (
    <PageContainer>
      <PageHeader
        title={`${meta.label} questions`}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Questions", href: "/questions" }, { label: meta.label }]}
        description={`${questions.length} of ${meta.target} ${meta.label.toLowerCase()} questions are loaded.`}
      />
      <Suspense fallback={<ExplorerSkeleton />}>
        <QuestionExplorer
          questions={questions}
          basePath={`/levels/${level}`}
          locked={{ difficulty: level }}
          contextLabel={meta.label}
          emptyDatasetTitle={`No ${meta.label.toLowerCase()} questions are loaded yet`}
          emptyDatasetDescription={`This level has a target of ${meta.target} questions. They will appear here as soon as their batches are added to data/questions/${level}.`}
        />
      </Suspense>
    </PageContainer>
  );
}
