import { AppShell } from "@/components/layout";

// TODO(Member 2 / Member 4): pass the signed-in user's role links and unread
// notification count once auth and notifications are available.
export default function MainLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
