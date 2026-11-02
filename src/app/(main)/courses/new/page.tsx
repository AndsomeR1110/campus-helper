import type { Metadata } from "next";
import { CourseForm } from "@/features/courses";

export const metadata: Metadata = { title: "Add course" };

export default function NewCoursePage() {
  return <CourseForm />;
}
