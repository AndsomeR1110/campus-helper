import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice } from "@/components/ui";
import { PostForm } from "@/features/lost-found";

export const metadata: Metadata = {
  title: "New lost or found post · Campus Helper",
};

/** PG-15 — Create post (FR-LF-02, LF-AC-01/02/03). */
export default function NewPostPage() {
  return (
    <>
      <TopBar title="New post" backHref="/lost-found" />
      <PageContainer width="content" className="flex flex-col gap-4 pb-8">
        <p className="text-body-sm text-text-muted">
          Describe the item so its owner can recognise it. Do not include ID numbers, full student
          numbers or phone numbers — this description is public.
        </p>
        <PostForm />
        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}
