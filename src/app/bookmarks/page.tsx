import { Suspense } from "react";
import type { Metadata } from "next";
import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { QuestionExplorer } from "@/components/explorer/question-explorer";
import { ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";
import { loadIndex } from "@/lib/content/load";

export const metadata: Metadata = { title: "Bookmarks" };

const LOCKED = { bookmarkedOnly: true } as const;

export default async function BookmarksPage() {
  const index = await loadIndex();
  return (
    <PageContainer>
      <PageHeader
        title="Bookmarks"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Bookmarks" }]}
        description="Questions you saved on this device. Bookmarks are stored in your browser and never leave it."
      />
      {index ? (
        <Suspense fallback={<ExplorerSkeleton />}>
          <QuestionExplorer questions={index.questions} basePath="/bookmarks" locked={LOCKED} contextLabel="Bookmarks" />
        </Suspense>
      ) : (
        <ContentUnavailable />
      )}
    </PageContainer>
  );
}
