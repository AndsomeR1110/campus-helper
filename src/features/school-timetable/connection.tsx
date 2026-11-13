"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { StickyActionBar } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  useOffline,
  buttonStyles,
} from "@/components/ui";
import { formatDateTimeRange } from "@/lib/time";
import { SchoolAccountSignIn, schoolAuthAvailable } from "@/features/school-auth";
import {
  connectionError,
  readSyncState,
  schoolTimetableAvailable,
  syncSchoolTimetable,
  type SyncState,
} from "./bridge";
const subscribe = () => () => {};
export function SchoolTimetableConnection({ actorId }: { actorId: string }) {
  const available = useSyncExternalStore(
    subscribe,
    () => schoolTimetableAvailable() && schoolAuthAvailable(),
    () => null,
  );
  const offline = useOffline();
  const [signIn, setSignIn] = useState(false);
  const [state, setState] = useState<SyncState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true),
    running = useRef(false);
  async function run() {
    if (running.current || offline) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await syncSchoolTimetable(actorId, () => active.current, true);
      if (active.current) setState(result);
    } catch (e) {
      if (active.current) {
        const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
        if (code === "AUTH_REQUIRED" || code === "ACCOUNT_SWITCH_REQUIRED") setSignIn(true);
        else setError(connectionError(e));
      }
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (available === null) return;
    let cancelled = false;
    void readSyncState()
      .then((saved) => {
        if (cancelled) return;
        setState(saved);
        if (saved.version > 0 && available && navigator.onLine) void run();
      })
      .catch((e) => {
        if (!cancelled) setError(connectionError(e));
      });
    return () => {
      cancelled = true;
    };
    // Refresh once on entering the connection page; interaction handles later refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, actorId]);
  if (available === null) return <Skeleton className="h-32" />;
  return (
    <div className="flex flex-col gap-4">
      {signIn && (
        <SchoolAccountSignIn
          actorId={actorId}
          service="timetable"
          onClose={() => setSignIn(false)}
          onConnected={(result) => {
            if (result.synced) {
              setState(result.synced);
              setError("");
            }
          }}
        />
      )}
      <Card className="flex flex-col gap-3">
        <h2 className="text-subtitle">School timetable</h2>
        <p className="text-body-sm text-text-muted">
          Sign in with your school account. Campus Helper will fetch and save your classes
          automatically to your current app account. Manual courses are kept. Matching school slots
          are shown once.
        </p>
        <p className="text-caption text-text-muted">
          Currently supports 2026/27 Semester 1. School sessions can expire and require
          reconnection.
        </p>
        {!available && (
          <EmptyState
            title="Open the Android app to connect"
            description="Your saved school timetable remains available on other devices."
          />
        )}
        {offline && (
          <p className="text-body-sm text-text-muted">
            Unavailable offline. Your saved timetable is kept.
          </p>
        )}
        {busy && (
          <p role="status" className="text-body-sm">
            Connecting to school and fetching your timetable…
          </p>
        )}
        {state?.syncedAt && (
          <p role="status" className="text-body-sm">
            {state.count} school activities saved · {state.term} ·{" "}
            {formatDateTimeRange(state.syncedAt, state.syncedAt)}
          </p>
        )}
        <Link href="/courses" className={buttonStyles({ variant: "secondary" })}>
          View my courses
        </Link>
      </Card>
      {error && <ErrorState description={error} onRetry={() => void run()} />}
      {available && (
        <StickyActionBar>
          <Button fullWidth disabled={busy || offline} loading={busy} onClick={() => void run()}>
            {state?.version ? "Refresh school timetable" : "Connect school account"}
          </Button>
        </StickyActionBar>
      )}
    </div>
  );
}
