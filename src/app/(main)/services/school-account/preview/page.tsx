import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { SchoolSignInDevPreview, SchoolSignInPreviewBanner } from "@/features/school-auth";

export const metadata: Metadata = {
  title: "School sign-in preview",
  robots: { index: false },
};

/** Development preview of the school sign-in sheet. Not linked from the app. */
export default function SchoolSignInPreviewPage() {
  return (
    <>
      <TopBar title="School sign-in" backHref="/services" />
      <PageContainer width="content">
        <SchoolSignInPreviewBanner />
        <SchoolSignInDevPreview />
      </PageContainer>
    </>
  );
}
