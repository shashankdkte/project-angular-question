import { Skeleton } from "@/components/ui/skeleton";

/** Fixed-height placeholder so the page doesn't jump when the explorer mounts. */
export function ExplorerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading questions">
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="hidden h-9 md:block" />
        ))}
      </div>
      <Skeleton className="h-5 w-56" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
