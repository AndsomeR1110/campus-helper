"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ConfirmDialog, toast } from "@/components/ui";
import type { PostStatus } from "../types";

/**
 * Resolve / close actions for the author (PG-16, FR-LF-06).
 * Both actions are confirmed because they stop the post accepting claims.
 */
export function PostOwnerActions({ postId, status }: { postId: string; status: PostStatus }) {
  const router = useRouter();
  const [target, setTarget] = useState<"RESOLVED" | "CLOSED" | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "RESOLVED" || status === "CLOSED" || status === "HIDDEN") return null;

  async function update(next: "RESOLVED" | "CLOSED") {
    setPending(true);
    try {
      const response = await fetch(`/api/lost-found/posts/${postId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(body?.error?.message ?? "Could not update this post.");
        return;
      }
      toast.success(next === "RESOLVED" ? "Marked as resolved" : "Post closed");
      router.refresh();
    } catch {
      toast.error("Check your connection and try again.");
    } finally {
      setPending(false);
      setTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onClick={() => setTarget("RESOLVED")}>
        Mark as resolved
      </Button>
      <Button variant="ghost" onClick={() => setTarget("CLOSED")}>
        Close this post
      </Button>

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target === "RESOLVED" ? "Mark this post as resolved?" : "Close this post?"}
        description={
          target === "RESOLVED"
            ? "Pending claims will be rejected and the post will stop accepting new ones."
            : "The post stays visible but stops accepting claims."
        }
        confirmLabel={target === "RESOLVED" ? "Mark as resolved" : "Close post"}
        tone={target === "RESOLVED" ? "primary" : "danger"}
        onConfirm={async () => {
          if (target) await update(target);
        }}
      />
      {pending && <span className="sr-only">Updating the post…</span>}
    </div>
  );
}
