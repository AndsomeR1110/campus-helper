import { Skeleton } from "@/components/ui";

/** Route-level placeholder for the dynamic segment (AGENTS.md, Next.js 16 notes). */
export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
