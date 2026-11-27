import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { AttendanceNotConnected } from "@/features/attendance";

export const metadata: Metadata = { title: "Class check-in" };

/** Real route: honest status until the AMS adapter and facade land (Codex). */
export default async function AttendancePage() {
  const t = await getTranslations();
  return (
    <>
      <TopBar title={t("Class check-in")} backHref="/services" />
      <PageContainer width="content">
        <AttendanceNotConnected />
      </PageContainer>
    </>
  );
}
