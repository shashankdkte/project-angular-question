import type { Metadata } from "next";
import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { ProgressView } from "@/components/progress/progress-view";
import { loadIndex } from "@/lib/content/load";

export const metadata: Metadata = { title: "Learning progress" };

export default async function ProgressPage() {
  const index = await loadIndex();
  return (
    <PageContainer>
      <PageHeader
        title="Learning progress"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Learning progress" }]}
        description="Where you stand across difficulty, industry, domain and topic. Stored in this browser."
      />
      {index ? <ProgressView questions={index.questions} /> : <ContentUnavailable />}
    </PageContainer>
  );
}
