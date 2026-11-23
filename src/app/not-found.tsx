import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/common/page";

export default function NotFound() {
  return (
    <PageContainer className="max-w-xl py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The question or page you are looking for isn’t in the loaded curriculum. It may belong to a batch that has not been added yet.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild>
          <Link href="/questions">Browse questions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
