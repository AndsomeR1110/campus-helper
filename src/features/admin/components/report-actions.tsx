"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ConfirmDialog, toast } from "@/components/ui";
import type { ReportDecision } from "../moderation";

/** Hide / keep buttons in the moderation queue (PG-19, LF-AC-09). */
export function ReportActions({ reportId, postTitle }: { reportId: string; postTitle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState<ReportDecision | null>(null);

  async function decide(decision: ReportDecision) {
    setPending(decision);
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(body?.error?.message ?? "Could not update this report.");
        return;
      }
      toast.success(decision === "HIDE" ? "Post hidden" : "Report dismissed");
      router.refresh();
    } catch {
      toast.error("Check your connection and try again.");
    } finally {
      setPending(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setConfirming(true)} loading={pending === "HIDE"}>
        Hide post
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void decide("DISMISS")}
        loading={pending === "DISMISS"}
      >
        Keep post
      </Button>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Hide this post?"
        description={`“${postTitle}” will disappear from the list. The author keeps a copy in My Posts.`}
        confirmLabel="Hide post"
        tone="danger"
        onConfirm={async () => {
          await decide("HIDE");
        }}
      />
    </div>
  );
}
