import { AppFrame } from "../_shell/app-frame";

// TODO(Member 4): pass the unread notification count (#29).
export default function MainLayout({ children }: LayoutProps<"/">) {
  return <AppFrame>{children}</AppFrame>;
}
