"use client";

import { useTranslations } from "@/lib/i18n/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ConfirmDialog, toast, useOffline } from "@/components/ui";

/** Log out with confirmation (PRD §4.3). Disabled offline (PWA-AC-04). */
export function LogoutButton() {
  const t = useTranslations();
  const router = useRouter();
  const offline = useOffline();
  const [open, setOpen] = useState(false);

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      toast.error(t("We couldn’t log you out. Check your connection and try again."));
      throw new Error("logout failed");
    }
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" fullWidth disabled={offline} onClick={() => setOpen(true)}>
        <LogOut />
        {t("Log out")}
      </Button>
      {offline && (
        <p className="text-center text-body-sm text-text-muted">{t("Unavailable offline")}</p>
      )}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Log out?")}
        description={t("You’ll need to sign in again to see your bookings and posts.")}
        confirmLabel={t("Log out")}
        cancelLabel={t("Stay signed in")}
        onConfirm={logout}
      />
    </>
  );
}
