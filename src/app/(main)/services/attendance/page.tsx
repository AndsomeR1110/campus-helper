import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { AttendanceNotConnected } from "@/features/attendance";

export const metadata: Metadata = { title: "Class check-in" };

/** Real route: honest status until the AMS adapter and facade land (Codex). */
export default function AttendancePage() {
  return (
    <>
      <TopBar title="Class check-in" backHref="/services" />
      <PageContainer width="content">
        <AttendanceNotConnected />
      </PageContainer>
    </>
  );
}
