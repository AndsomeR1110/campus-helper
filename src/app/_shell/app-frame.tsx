import { Suspense, type ReactNode } from "react";
import { AppShell, SideNavRoleTools } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";

/** Reads the session, so it streams in at request time without blocking the shell. */
async function RoleTools() {
  const user = await getCurrentUser();
  return <SideNavRoleTools role={user?.role} />;
}

/**
 * The signed-in app frame (SideNav / BottomNav), shared by the student pages,
 * the teacher dashboard and the admin dashboard so every area looks the same.
 */
export function AppFrame({ children }: { children: ReactNode }) {
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
