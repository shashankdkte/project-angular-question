import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentUnavailable, PageContainer, PageHeader } from "@/components/common/page";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/curriculum";
import { contentRepository } from "@/lib/content/repository";
import { loadIndex } from "@/lib/content/load";

export const metadata: Metadata = { title: "Industries" };

export default async function IndustriesPage() {
  const [index, projects] = await Promise.all([loadIndex(), contentRepository.getProjects()]);
  return (
    <PageContainer>
      <PageHeader
        title="Industries"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Industries" }]}
        description="Each question is tagged with the industries where it matters. Counts come from the loaded questions."
      />
      {!index ? (
        <ContentUnavailable />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => {
            const count = index.questions.filter((question) => question.industries.includes(industry)).length;
            const projectCount = projects.filter((project) => project.industry === industry).length;
            return (
              <li key={industry}>
                <Link
                  href={`/industries/${industry}`}
                  className="group flex h-full flex-col rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex items-center justify-between">
                    <span className="text-base font-medium">{INDUSTRY_LABELS[industry]}</span>
                    <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-3 text-sm text-muted-foreground tabular-nums">
                    {count} question{count === 1 ? "" : "s"} · {projectCount} project{projectCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
