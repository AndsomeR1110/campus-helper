"use client";

import { useTranslations } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { IconButton, Spinner, toast, useOffline } from "@/components/ui";

/** PG-13 bulk action (NT-AC-02). Icon button so it fits the TopBar next to the title. */
export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const offline = useOffline();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!response.ok) {
        throw new Error(t("Could not mark notifications as read."));
      }
      toast.success(t("All notifications marked as read"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Something went wrong."));
    } finally {
      setPending(false);
    }
  }

  return (
    <IconButton
      aria-label={t("Mark all as read")}
      title={t("Mark all as read")}
      onClick={handleClick}
      disabled={disabled || offline || pending}
      className="text-primary"
    >
      {pending ? <Spinner /> : <CheckCheck />}
    </IconButton>
  );
}
