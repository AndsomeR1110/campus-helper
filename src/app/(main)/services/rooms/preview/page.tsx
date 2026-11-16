import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { RoomsDevPreview, RoomsSkeleton } from "@/features/school-rooms";
import { dayKey } from "@/lib/time";

export const metadata: Metadata = {
  title: "Discussion rooms preview",
  robots: { index: false },
};

async function Content() {
  await connection();
  return <RoomsDevPreview today={dayKey(new Date())} />;
}

/** Development preview with fictional data. Not linked from the app. */
export default function RoomsPreviewPage() {
  return (
    <>
      <TopBar title="Discussion rooms" backHref="/services" />
      <PageContainer>
        <Suspense fallback={<RoomsSkeleton />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
