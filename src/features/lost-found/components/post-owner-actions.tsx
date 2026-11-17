"use client";

import { useTranslations } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Archive, CircleCheck } from "lucide-react";
import { Button, ConfirmDialog, cardStyles, toast } from "@/components/ui";

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
  const t = useTranslations();
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
        toast.error(payload.error?.message ?? t("The post could not be updated."));
        return;
      }
      toast.success(value === "RESOLVED" ? t("Marked as resolved.") : t("Post closed."));
      router.refresh();
    } finally {
      setPending(false);
      setNext(null);
    }
  }

  if (status === "RESOLVED" || status === "CLOSED") return null;

  return (
    <section
      aria-labelledby="owner-actions"
      className={cardStyles({ className: "flex flex-col gap-3" })}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="owner-actions" className="text-subtitle">
          {t("Manage your post")}
        </h2>
        <p className="text-body-sm text-text-muted">
          {t(
            "Mark it resolved once the item is back with its owner, or close it if it no longer matters.",
          )}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => setNext("RESOLVED")} loading={pending}>
          <CircleCheck />
          {t("Mark as resolved")}
        </Button>
        <Button variant="secondary" onClick={() => setNext("CLOSED")} loading={pending}>
          <Archive />
          {t("Close this post")}
        </Button>
      </div>

      <ConfirmDialog
        open={next !== null}
        title={next === "RESOLVED" ? t("Mark as resolved?") : t("Close this post?")}
        description={
          next === "RESOLVED"
            ? t(
                "Use this after the item is back with its owner. No further claims will be accepted.",
              )
            : t("The post stops taking claims. You can still read it from My posts.")
        }
        confirmLabel={next === "RESOLVED" ? t("Mark resolved") : t("Close post")}
        tone={next === "RESOLVED" ? "primary" : "danger"}
        onClose={() => setNext(null)}
        onConfirm={async () => {
          if (next) await apply(next);
        }}
      />
    </section>
  );
}
