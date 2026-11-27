"use client";

import { useTranslations } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ConfirmDialog, toast } from "@/components/ui";

import type { ModerationReport, ReportDecision } from "../types";

export interface ReportActionsProps {
  report: ModerationReport;
}

/** The two decisions available on a pending report. */
export function ReportActions({ report }: ReportActionsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [decision, setDecision] = useState<ReportDecision | null>(null);
  const [pending, setPending] = useState(false);

  async function apply(next: ReportDecision) {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: next }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        toast.error(body?.error?.message ?? t("The decision could not be saved."));
        return;
      }
      toast.success(next === "HIDE" ? t("Post hidden.") : t("Report dismissed."));
      setDecision(null);
      router.refresh();
    } catch {
      toast.error(t("The decision could not be saved. Check your connection."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => setDecision("HIDE")}>
        {t("Hide post")}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setDecision("DISMISS")}>
        {t("Keep post")}
      </Button>

      <ConfirmDialog
        open={decision !== null}
        title={decision === "HIDE" ? t("Hide this post?") : t("Dismiss this report?")}
        description={
          decision === "HIDE"
            ? t(
                '"{title}" will disappear from browse and stop taking claims. The author is not notified in this version.',
                { title: report.postTitle },
              )
            : t('"{title}" stays visible and the report is closed as dismissed.', {
                title: report.postTitle,
              })
        }
        confirmLabel={decision === "HIDE" ? t("Hide post") : t("Dismiss report")}
        tone={decision === "HIDE" ? "danger" : "primary"}
        onClose={() => setDecision(null)}
        onConfirm={async () => {
          if (decision) await apply(decision);
        }}
      />
      {pending ? <span className="text-caption text-text-muted">{t("Saving…")}</span> : null}
    </div>
  );
}
