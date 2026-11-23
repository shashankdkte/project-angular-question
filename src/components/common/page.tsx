import * as React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {last || !item.href ? (
                  <BreadcrumbPage className="max-w-[28ch] truncate sm:max-w-[48ch]">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Standard page width + padding. Reading pages use their own narrower column. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 space-y-3">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
          {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center", className)} data-testid="empty-state">
      {Icon && <Icon aria-hidden className="mb-3 size-6 text-muted-foreground" />}
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ContentUnavailable() {
  return (
    <EmptyState
      title="Question content has not been built yet"
      description={
        <>
          Run <code className="inline-code">npm run content:build</code> (or start the app with{" "}
          <code className="inline-code">npm run dev</code>) to generate the index from <code className="inline-code">data/questions</code>.
        </>
      }
    />
  );
}
