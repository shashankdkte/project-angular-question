import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading question">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
