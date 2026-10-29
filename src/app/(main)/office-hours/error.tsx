"use client";

import { useEffect } from "react";

import { Button, ErrorState } from "@/components/ui";

/**
 * Error boundary for office hours (CONTRIBUTING review point: Loading / Empty / Error
 * states must all be covered).
 *
 * Next.js 16 passes `retry`, not `reset` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
 */
export default function OfficeHoursError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[office-hours] render error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[--container-list] flex-col px-5 py-8">
      <ErrorState
        kind="server"
        action={
          <Button variant="secondary" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
