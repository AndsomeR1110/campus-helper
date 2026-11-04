"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ConfirmDialog, toast } from "@/components/ui";

import type { LostFoundPost } from "../types";

type Next = "RESOLVED" | "CLOSED";

/** Author-only actions on PG-16: the loop closes after the handover (FR-LF-06). */
export function PostOwnerActions({
  postId,
  status,
}: {
  postId: string;
  status: LostFoundPost["status"];
}) {
  const router = useRouter();
  const [next, setNext] = useState<Next | null>(null);
  const [pending, setPending] = useState(false);

  async function apply(value: Next) {
    setPending(true);
    try {
      const response = await fetch(`/api/lost-found/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        toast.error(payload.error?.message ?? "The post could not be updated.");
        return;
      }
      toast.success(value === "RESOLVED" ? "Marked as resolved." : "Post closed.");
      router.refresh();
    } finally {
      setPending(false);
      setNext(null);
    }
  }

  if (status === "RESOLVED" || status === "CLOSED") return null;

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" fullWidth onClick={() => setNext("RESOLVED")} loading={pending}>
        Mark as resolved
      </Button>
      <Button variant="ghost" fullWidth onClick={() => setNext("CLOSED")} loading={pending}>
        Close this post
      </Button>

      <ConfirmDialog
        open={next !== null}
        title={next === "RESOLVED" ? "Mark as resolved?" : "Close this post?"}
        description={
          next === "RESOLVED"
            ? "Use this after the item is back with its owner. No further claims will be accepted."
            : "The post stops taking claims. You can still read it from My posts."
        }
        confirmLabel={next === "RESOLVED" ? "Mark resolved" : "Close post"}
        tone={next === "RESOLVED" ? "primary" : "danger"}
        onClose={() => setNext(null)}
        onConfirm={async () => {
          if (next) await apply(next);
        }}
      />
    </div>
  );
}
