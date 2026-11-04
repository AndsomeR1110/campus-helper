import { Suspense } from "react";
import { connection } from "next/server";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { SpaceList } from "@/features/spaces";
import { resolveSpaceQuery, spaceService, type SpaceSearchParams } from "@/features/spaces/server";
export default function SpacesPage({ searchParams }: { searchParams: Promise<SpaceSearchParams> }) {
  return (
    <>
      <TopBar title="Find a study space" backHref="/services" />
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-40" />}>
          <SpacesContent searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </>
  );
}
async function SpacesContent({ searchParams }: { searchParams: Promise<SpaceSearchParams> }) {
  await connection();
  const resolved = resolveSpaceQuery(await searchParams, new Date());
  const catalog = await spaceService.catalog();
  const spaces = resolved.parsed
    ? await spaceService.search(resolved.parsed.filters, resolved.parsed.range)
    : [];
  return (
    <SpaceList spaces={spaces} catalog={catalog} query={resolved.query} error={resolved.error} />
  );
}
