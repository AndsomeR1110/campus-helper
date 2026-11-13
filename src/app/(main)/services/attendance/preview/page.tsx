import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { AttendanceDevPreview, AttendanceSkeleton } from "@/features/attendance";
import { dayKey } from "@/lib/time";

export const metadata: Metadata = {
  title: "Class check-in preview",
  robots: { index: false },
};

async function Content() {
  await connection();
  return <AttendanceDevPreview today={dayKey(new Date())} />;
}

/** Development preview with fictional data. Not linked from the app. */
export default function AttendancePreviewPage() {
  return (
    <>
      <TopBar title="Class check-in" backHref="/services" />
      <PageContainer width="content">
        <Suspense fallback={<AttendanceSkeleton />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
