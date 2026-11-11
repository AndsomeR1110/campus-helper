"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { IconButton, Spinner, toast, useOffline } from "@/components/ui";

/** PG-13 bulk action (NT-AC-02). Icon button so it fits the TopBar next to the title. */
export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const offline = useOffline();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not mark notifications as read.");
      }
      toast.success("All notifications marked as read");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <IconButton
      aria-label="Mark all as read"
      title="Mark all as read"
      onClick={handleClick}
      disabled={disabled || offline || pending}
      className="text-primary"
    >
      {pending ? <Spinner /> : <CheckCheck />}
    </IconButton>
  );
}
