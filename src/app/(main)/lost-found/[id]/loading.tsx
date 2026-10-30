import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";

/** Required for the dynamic `[id]` route (frontend-architecture §5.1). */
export default function PostLoading() {
  return (
    <>
      <TopBar title="Post" backHref="/lost-found" />
      <PageContainer width="content" className="flex flex-col gap-4 pb-10">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    </>
  );
}
