"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/common/page";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="max-w-xl py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong on this page</h1>
      <p className="mt-2 text-sm text-muted-foreground" role="alert">
        {error.message || "An unexpected error occurred."} Your saved progress is not affected.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </PageContainer>
  );
}
