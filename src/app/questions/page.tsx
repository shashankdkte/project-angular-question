import { Suspense } from "react";
import type { Metadata } from "next";
import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { QuestionExplorer } from "@/components/explorer/question-explorer";
import { ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";
import { CURRICULUM_TARGET } from "@/lib/curriculum";
import { loadIndex } from "@/lib/content/load";

export const metadata: Metadata = { title: "All questions" };

export default async function QuestionsPage() {
  const index = await loadIndex();
  if (!index) {
    return (
      <PageContainer>
        <PageHeader title="All questions" />
        <ContentUnavailable />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="All questions"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Questions" }]}
        description={`${index.total} of ${CURRICULUM_TARGET} curriculum questions are loaded. Search and filter to find what to study next.`}
      />
      <Suspense fallback={<ExplorerSkeleton />}>
        <QuestionExplorer questions={index.questions} basePath="/questions" contextLabel="All questions" />
      </Suspense>
    </PageContainer>
  );
}
