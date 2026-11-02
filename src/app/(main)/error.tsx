"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function MainError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <ErrorState kind="server" onRetry={retry} />
    </div>
  );
}
