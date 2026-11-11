import { Skeleton } from "@/components/ui";

/** Loading shell for `/office-hours` (loading state required by CONTRIBUTING's DoD). */
export default function OfficeHoursLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-list flex-col gap-6 px-4 py-4 md:px-6 md:py-6"
      aria-busy
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 sm:w-56" />
        <Skeleton className="h-11 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"
          >
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
