import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageContainer, PageHeader } from "@/components/common/page";
import { ProjectCard } from "@/components/projects/project-card";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/curriculum";
import { contentRepository } from "@/lib/content/repository";
import { loadIndex } from "@/lib/content/load";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const [projects, index] = await Promise.all([contentRepository.getProjects(), loadIndex()]);
  const loadedIds = new Set(index?.questions.map((question) => question.id) ?? []);

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Projects" }]}
        description="Industry projects that tie the concepts together. Only projects defined in data/projects are shown; none are assumed."
      />
      <div className="space-y-10">
        {INDUSTRIES.map((industry) => {
          const items = projects.filter((project) => project.industry === industry);
          return (
            <section key={industry} aria-labelledby={`industry-${industry}`} className="space-y-3">
              <h2 id={`industry-${industry}`} className="text-base font-semibold tracking-tight">
                <Link href={`/industries/${industry}`} className="underline-offset-4 hover:underline">
                  {INDUSTRY_LABELS[industry]}
                </Link>
              </h2>
              {items.length === 0 ? (
                <EmptyState
                  className="py-8"
                  title={`No ${INDUSTRY_LABELS[industry]} project has been defined yet`}
                  description="Projects are added as JSON files under data/projects. Until then this stays empty."
                />
              ) : (
                <div className="space-y-4">
                  {items.map((project) => (
                    <ProjectCard key={project.id} project={project} loadedQuestionIds={loadedIds} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PageContainer>
  );
}
