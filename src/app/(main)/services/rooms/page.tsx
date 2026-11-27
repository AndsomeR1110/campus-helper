import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { SchoolRoomsConnection } from "@/features/school-rooms";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/courses/server";
import { dayKey } from "@/lib/time";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Discussion rooms" };

async function Content() {
  await connection();
  const user = await getCurrentUser();
  return <SchoolRoomsConnection key={user.id} actorId={user.id} today={dayKey(new Date())} />;
}
export default function RoomsPage() {
  return (
    <>
      <TopBar title="Discussion rooms" backHref="/services" />
      <PageContainer>
        <Suspense fallback={null}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
