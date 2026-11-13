import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { getCurrentUser } from "@/features/courses/server";
import { SchoolTimetableConnection } from "@/features/school-timetable";
async function Content() {
  const user = await getCurrentUser();
  return <SchoolTimetableConnection key={user.id} actorId={user.id} />;
}
export default function Page() {
  return (
    <>
      <TopBar title="School timetable" backHref="/courses" />
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-32" />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
