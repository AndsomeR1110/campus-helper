import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice, Skeleton } from "@/components/ui";
import { SpaceDetail } from "@/features/spaces";
import { resolveSpaceQuery, spaceService, type SpaceSearchParams } from "@/features/spaces/server";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<SpaceSearchParams> };
export default function SpacePage(props: Props) {
  return (
    <>
      <TopBar title="Study seat" backHref="/spaces" />
      <PageContainer width="content">
        <Suspense fallback={<Skeleton className="h-40" />}>
          <SpaceContent {...props} />
        </Suspense>
      </PageContainer>
    </>
  );
}
async function SpaceContent({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const now = new Date();
  const catalog = await spaceService.catalog();
  const space = catalog.find((s) => s.id === id);
  if (!space) notFound();
  const resolved = resolveSpaceQuery(await searchParams, now);
  const available = resolved.parsed
    ? ((await spaceService.search({}, resolved.parsed.range)).find((s) => s.id === id)?.available ??
      false)
    : false;
  const bookings = (await spaceService.listMine()).filter((b) => b.spaceId === id);
  return (
    <>
      {!resolved.parsed && <DemoDataNotice />}
      <SpaceDetail
        space={{ ...space, available }}
        range={resolved.parsed?.range}
        query={resolved.query}
        error={resolved.error}
        bookings={bookings}
        now={now.toISOString()}
      />
    </>
  );
}
