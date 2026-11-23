import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MermaidDiagram } from "@/components/diagrams/mermaid-diagram";
import type { Project } from "@/lib/schemas/project";

const STATUS_LABEL: Record<Project["status"], string> = {
  planned: "Planned, not built yet",
  "in-progress": "In progress",
  completed: "Completed",
};

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm marker:text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Renders only what the project file declares. Repo links and milestones appear only if provided. */
export function ProjectCard({ project, loadedQuestionIds }: { project: Project; loadedQuestionIds: ReadonlySet<string> }) {
  const related = project.relatedQuestionIds.filter((id) => loadedQuestionIds.has(id));
  return (
    <article className="space-y-5 rounded-lg border p-5" aria-labelledby={`project-${project.id}`} data-testid="project-card">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`project-${project.id}`} className="text-lg font-semibold tracking-tight">
            {project.title}
          </h3>
          <Badge variant="outline" className="font-normal">
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        {project.techStack.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
            {project.techStack.map((tech) => (
              <li key={tech} className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {tech}
              </li>
            ))}
          </ul>
        )}
        {project.repositoryUrl && (
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            Repository <ExternalLink aria-hidden className="size-3.5" />
          </a>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <List title="Business objectives" items={project.businessObjectives} />
        <List title="Modules" items={project.modules.map((m) => (m.description ? `${m.name}: ${m.description}` : m.name))} />
        <List title="Milestones" items={project.milestones.map((m) => `${m.title} (${m.status.replace("-", " ")})`)} />
      </div>

      {related.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Related questions</h4>
          <ul className="flex flex-wrap gap-2">
            {related.map((id) => (
              <li key={id}>
                <Link href={`/questions/${id}`} className="rounded-md border px-2 py-1 font-mono text-xs transition-colors hover:bg-muted">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {project.architectureDiagrams?.map((diagram) => (
        <MermaidDiagram key={diagram.id} id={diagram.id} source={diagram.mermaid} title={diagram.title} description={diagram.caption} />
      ))}
    </article>
  );
}
