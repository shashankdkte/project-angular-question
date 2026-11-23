import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentUnavailable, EmptyState, PageContainer, PageHeader } from "@/components/common/page";
import { ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";
import { QuestionExplorer } from "@/components/explorer/question-explorer";
import { ProjectCard } from "@/components/projects/project-card";
import { INDUSTRIES, INDUSTRY_LABELS, type IndustryId } from "@/lib/curriculum";
import { contentRepository } from "@/lib/content/repository";
import { loadIndex } from "@/lib/content/load";

type Params = Promise<{ industry: string }>;

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ industry }));
}

const isIndustry = (value: string): value is IndustryId => (INDUSTRIES as readonly string[]).includes(value);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { industry } = await params;
  return { title: isIndustry(industry) ? INDUSTRY_LABELS[industry] : "Industry not found" };
}

export default async function IndustryPage({ params }: { params: Params }) {
  const { industry } = await params;
  if (!isIndustry(industry)) notFound();
  const label = INDUSTRY_LABELS[industry];

  const [index, allProjects] = await Promise.all([loadIndex(), contentRepository.getProjects()]);
  const projects = allProjects.filter((project) => project.industry === industry);
  const loadedIds = new Set(index?.questions.map((question) => question.id) ?? []);
  const questions = index?.questions.filter((question) => question.industries.includes(industry)) ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={label}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Industries", href: "/industries" }, { label }]}
        description={`${questions.length} loaded question${questions.length === 1 ? "" : "s"} relevant to ${label}.`}
      />
      <div className="space-y-10">
        <section aria-labelledby="projects-heading" className="space-y-3">
          <h2 id="projects-heading" className="text-base font-semibold tracking-tight">
            Projects
          </h2>
          {projects.length === 0 ? (
            <EmptyState className="py-8" title={`No ${label} project has been defined yet`} description="Projects are added as JSON files under data/projects." />
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} loadedQuestionIds={loadedIds} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="questions-heading" className="space-y-3">
          <h2 id="questions-heading" className="text-base font-semibold tracking-tight">
            Questions
          </h2>
          {index ? (
            <Suspense fallback={<ExplorerSkeleton />}>
              <QuestionExplorer
                questions={questions}
                basePath={`/industries/${industry}`}
                locked={{ industry }}
                contextLabel={label}
                emptyDatasetTitle={`No ${label} questions are loaded yet`}
                emptyDatasetDescription="Questions appear here when a loaded batch is tagged with this industry."
              />
            </Suspense>
          ) : (
            <ContentUnavailable />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
