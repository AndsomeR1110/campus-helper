import { Suspense } from "react";
import { AppShell, SideNavRoleTools } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";

/** Reads the session, so it streams in at request time without blocking the shell. */
async function RoleTools() {
  const user = await getCurrentUser();
  return <SideNavRoleTools role={user?.role} />;
}

// TODO(Member 4): pass the unread notification count (#29).
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      roleLinks={
        <Suspense fallback={null}>
          <RoleTools />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
