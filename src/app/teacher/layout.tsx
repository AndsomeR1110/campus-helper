import { AppFrame } from "../_shell/app-frame";

/** Teacher tools live in the same app frame as the student pages. */
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return <AppFrame>{children}</AppFrame>;
}
