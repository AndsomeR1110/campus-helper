import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { CourseForm } from "@/features/courses";
import { getCourse, getCurrentUser } from "@/features/courses/server";

export const metadata: Metadata = { title: "Edit course" };

async function CourseEditor({ id }: { id: string }) {
  await connection();

  try {
    const user = await getCurrentUser();
    const course = await getCourse(user.id, id);

    return <CourseForm course={course} />;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}

function EditorSkeleton() {
  return (
    <>
      <TopBar title="Edit course" backHref="/courses" />
      <PageContainer width="content">
        <Skeleton className="h-64 w-full" aria-hidden />
      </PageContainer>
    </>
  );
}

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <CourseEditor id={id} />
    </Suspense>
  );
}
