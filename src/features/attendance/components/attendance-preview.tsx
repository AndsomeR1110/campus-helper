"use client";
/**
 * DEVELOPMENT PREVIEW of AMS check-in with fictional classes and a state
 * switcher. Lives on its own route; the real route never imports this file.
 */
import { useState } from "react";
import { Card, Chip, ChipGroup } from "@/components/ui";
import { PREVIEW_CODE, previewClasses } from "../preview-data";
import type { AttendanceClass, CheckInOutcome } from "../types";
import { AttendanceView, type AttendanceStatus } from "./attendance-view";
import { PreviewBanner } from "./preview-banner";

const SCREENS: { id: AttendanceStatus | "empty"; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "No classes" },
  { id: "not-connected", label: "Not connected" },
  { id: "signed-out", label: "Signed out" },
  { id: "error", label: "Error" },
];
type Result = "code" | "pending" | "not-open" | "closed" | "unknown" | "auth";
const RESULTS: { id: Result; label: string }[] = [
  { id: "code", label: `Check code (${PREVIEW_CODE})` },
  { id: "pending", label: "Awaiting school" },
  { id: "not-open", label: "Not open" },
  { id: "closed", label: "Closed" },
  { id: "unknown", label: "Result unknown" },
  { id: "auth", label: "Session expired" },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AttendancePreview({ today }: { today: string }) {
  const [screen, setScreen] = useState<AttendanceStatus | "empty">("ready");
  const [result, setResult] = useState<Result>("code");
  const [offline, setOffline] = useState(false);
  const [classes, setClasses] = useState<AttendanceClass[]>(() => previewClasses(today));

  async function submit(cls: AttendanceClass, code: string): Promise<CheckInOutcome> {
    await wait(900);
    if (result !== "code") {
      if (result === "pending")
        setClasses((list) => list.map((c) => (c.id === cls.id ? { ...c, record: "PENDING" } : c)));
      return { kind: result };
    }
    if (code !== PREVIEW_CODE) return { kind: "wrong-code" };
    const recordedAt = new Date().toISOString();
    setClasses((list) =>
      list.map((c) => (c.id === cls.id ? { ...c, record: "PRESENT", recordedAt } : c)),
    );
    return { kind: "recorded", record: "PRESENT", recordedAt };
  }

  return (
    <div className="flex flex-col gap-6">
      <PreviewBanner service="AMS check-in" />
      <Card className="flex flex-col gap-3">
        <h2 className="text-caption tracking-wide text-text-muted uppercase">Preview controls</h2>
        <Control label="Screen">
          {SCREENS.map((s) => (
            <Chip key={s.id} selected={screen === s.id} onClick={() => setScreen(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Control>
        <Control label="Next check-in result">
          {RESULTS.map((r) => (
            <Chip key={r.id} selected={result === r.id} onClick={() => setResult(r.id)}>
              {r.label}
            </Chip>
          ))}
        </Control>
        <Control label="Network">
          <Chip selected={!offline} onClick={() => setOffline(false)}>
            Online
          </Chip>
          <Chip selected={offline} onClick={() => setOffline(true)}>
            Offline
          </Chip>
        </Control>
        <button
          type="button"
          className="self-start text-body-sm text-primary underline-offset-2 hover:underline"
          onClick={() => setClasses(previewClasses(today))}
        >
          Reset preview classes
        </button>
      </Card>
      <AttendanceView
        status={screen === "empty" ? "ready" : screen}
        today={today}
        classes={screen === "empty" ? [] : classes}
        offlineOverride={offline}
        onRetry={() => setScreen("ready")}
        onSignIn={() => setScreen("ready")}
        onRefresh={() =>
          setClasses((list) =>
            list.map((c) =>
              c.record === "PENDING"
                ? { ...c, record: "PRESENT", recordedAt: new Date().toISOString() }
                : c,
            ),
          )
        }
        onSubmit={submit}
      />
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-body-sm font-medium" aria-hidden>
        {label}
      </span>
      <ChipGroup label={label}>{children}</ChipGroup>
    </div>
  );
}
