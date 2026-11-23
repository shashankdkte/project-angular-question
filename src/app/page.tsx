import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { loadIndex } from "@/lib/content/load";

export default async function DashboardPage() {
  const index = await loadIndex();
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Your Angular learning progress, calculated from the questions that are currently loaded."
      />
      {index ? <DashboardView questions={index.questions} /> : <ContentUnavailable />}
    </PageContainer>
  );
}
