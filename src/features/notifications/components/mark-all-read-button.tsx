"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast, useOffline } from "@/components/ui";

/** PG-13 bulk action (NT-AC-02). */
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
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      loading={pending}
      disabled={disabled || offline}
    >
      Mark all as read
    </Button>
  );
}
