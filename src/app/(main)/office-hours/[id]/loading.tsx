import { Skeleton } from "@/components/ui";

/**
 * Loading shell for `/office-hours/[id]` (AGENTS.md: every route with a dynamic segment
 * needs a `loading.tsx`, otherwise awaiting `params` fails the build).
 * Mirrors the real layout: header block + three slot rows.
 */
export default function TeacherDetailLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-list flex-col gap-6 px-4 py-4 md:px-6 md:py-6"
      aria-busy
    >
      <Skeleton className="h-4 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-20 items-center justify-between rounded-md border border-border bg-surface p-4"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
