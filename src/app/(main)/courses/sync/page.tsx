import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { getCurrentUser } from "@/features/courses/server";
import { ConnectionSkeleton, SchoolTimetableConnection } from "@/features/school-timetable";

export const metadata: Metadata = { title: "School timetable" };

async function Content() {
  const user = await getCurrentUser();
  return <SchoolTimetableConnection actorId={user.id} />;
}

export default function Page() {
  return (
    <>
      <TopBar title="School timetable" backHref="/courses" />
      <PageContainer width="content">
        <Suspense fallback={<ConnectionSkeleton />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
