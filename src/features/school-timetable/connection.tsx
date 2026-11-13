"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  CalendarSync,
  CircleAlert,
  Clock,
  Info,
  KeyRound,
  ListChecks,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { StickyActionBar } from "@/components/layout";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  Spinner,
  StatusBadge,
  buttonStyles,
  toast,
  useOffline,
} from "@/components/ui";
import { formatRelativeDay, formatRelativeTime, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  connectionError,
  forgetSchoolConnection,
  readSyncState,
  schoolTimetableAvailable,
  syncSchoolTimetable,
  type SyncState,
} from "./bridge";
import {
  classCount,
  connectionStatus,
  hasSnapshot,
  primaryActionLabel,
  syncPhase,
  type SyncPhase,
} from "./sync-status";

const subscribe = () => () => {};
const isCancelled = (e: unknown) =>
  Boolean(e && typeof e === "object" && "code" in e && e.code === "CANCELLED");

/** Current time for relative labels, read only on the client after mount. */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function SchoolTimetableConnection({ actorId }: { actorId: string }) {
  const available = useSyncExternalStore(subscribe, schoolTimetableAvailable, () => null);
  const offline = useOffline();
  const now = useNow();
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [forgetFailure, setForgetFailure] = useState("");
  const active = useRef(true);
  const running = useRef(false);

  // The facade owns native connection, validation and the server save; this
  // only serialises attempts and ignores results after the page is left.
  async function run() {
    if (running.current || offline) return;
    running.current = true;
    setBusy(true);
    setError("");
    setCancelled(false);
    try {
      const result = await syncSchoolTimetable(actorId, () => active.current);
      if (active.current) setState(result);
    } catch (e) {
      if (!active.current) return;
      setCancelled(isCancelled(e));
      setError(connectionError(e));
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
    let ignore = false;
    void readSyncState()
      .then((saved) => {
        if (ignore) return;
        setLoadError(false);
        setState(saved);
        // Refresh once on entering the page; later refreshes are user-initiated.
        if (loadAttempt === 0 && saved.version > 0 && available && navigator.onLine) void run();
      })
      .catch(() => {
        if (!ignore) setLoadError(true);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, actorId, loadAttempt]);

  async function forget() {
    setForgetFailure("");
    try {
      await forgetSchoolConnection(actorId);
    } catch (e) {
      setForgetFailure("Couldn’t disconnect this device. Please try again.");
      throw e;
    }
    setForgetOpen(false);
    toast.success("This device is disconnected");
  }

  const phase = syncPhase({ available, state, busy, error, cancelled, loadError });

  if (phase === "load-error") {
    return (
      <ErrorState
        kind={offline ? "offline" : "server"}
        description="We couldn’t load your saved school timetable."
        onRetry={() => {
          setLoadError(false);
          setLoadAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (phase === "checking") return <ConnectionSkeleton />;

  const action = primaryActionLabel(phase, state);
  const synced = state?.syncedAt ?? null;
  const summary =
    synced && now !== null ? `Synced ${formatRelativeTime(synced, now)}` : "Not synced yet";

  return (
    <div className="flex flex-col gap-6">
      <Card variant="widget" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-event-class-subtle text-event-class">
            <CalendarSync className="size-7" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <h2 className="text-title">School timetable</h2>
            <p className="text-body-sm text-text-muted">
              Your classes, fetched from your university account.
            </p>
            <StatusBadge kind="connection" status={connectionStatus(phase, state)} />
          </div>
        </div>

        <dl className="flex flex-col divide-y divide-liquid-edge rounded-md bg-surface-muted/60 px-4">
          <InfoRow icon={Clock} label="Last synced">
            {synced && now !== null
              ? `${formatRelativeDay(synced, now)}, ${formatTime(synced)}`
              : "Never"}
          </InfoRow>
          <InfoRow icon={BookOpen} label="Saved classes">
            {hasSnapshot(state) ? classCount(state!.count) : "None yet"}
          </InfoRow>
          <InfoRow icon={CalendarRange} label="Term">
            {state?.term ?? "2026/27 Semester 1"}
          </InfoRow>
        </dl>

        <SyncMessage phase={phase} error={error} hasSaved={hasSnapshot(state)} />

        <Link
          href="/courses"
          className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          View my courses
        </Link>
      </Card>

      <HowItWorks />

      {available && hasSnapshot(state) && (
        <section aria-labelledby="device-heading" className="flex flex-col gap-2">
          <h2
            id="device-heading"
            className="text-caption tracking-wide text-text-muted uppercase"
          >
            This device
          </h2>
          <Card className="flex flex-col gap-3">
            <p className="text-body-sm text-text-muted">
              This device keeps an encrypted school connection so refreshes don’t ask you to sign in
              again. Disconnecting removes it from this device only. Your saved classes stay.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={busy}
              onClick={() => {
                setForgetFailure("");
                setForgetOpen(true);
              }}
            >
              <Unplug className="size-4" aria-hidden />
              Disconnect this device
            </Button>
          </Card>
        </section>
      )}

      {action && (
        <StickyActionBar summary={summary}>
          {offline && (
            <p className="text-body-sm text-text-muted">
              Unavailable offline. Your saved timetable is kept.
            </p>
          )}
          <Button
            size="lg"
            fullWidth
            disabled={busy || offline}
            loading={busy}
            onClick={() => void run()}
          >
            {action}
          </Button>
        </StickyActionBar>
      )}

      <ConfirmDialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        title="Disconnect this device?"
        description={
          <>
            Campus Helper will forget the school connection stored on this device. Your saved
            classes stay, and the next refresh will ask you to sign in to your school account.
            {forgetFailure && (
              <span role="alert" className="mt-2 block text-danger">
                {forgetFailure}
              </span>
            )}
          </>
        }
        confirmLabel="Disconnect device"
        cancelLabel="Keep connected"
        onConfirm={forget}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <dt className="flex items-center gap-2 text-body-sm text-text-muted">
        <Icon className="size-4" aria-hidden />
        {label}
      </dt>
      <dd className="ml-auto text-right text-body-sm tabular-nums">{children}</dd>
    </div>
  );
}

const MESSAGE_TONE = {
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning",
  neutral: "bg-neutral-subtle text-neutral",
} as const;

/** Live region for progress and the outcome of the last attempt. */
function SyncMessage({
  phase,
  error,
  hasSaved,
}: {
  phase: SyncPhase;
  error: string;
  hasSaved: boolean;
}) {
  let tone: keyof typeof MESSAGE_TONE | null = null;
  let icon: React.ReactNode = null;
  let title = "";
  let body = "";
  switch (phase) {
    case "connecting":
    case "refreshing":
      tone = "info";
      icon = <Spinner className="size-4" />;
      title = phase === "connecting" ? "Connecting to your school…" : "Refreshing your timetable…";
      body =
        "If a school sign-in window opens, finish signing in there. " +
        (hasSaved ? "Your saved classes stay until the new timetable is saved." : "");
      break;
    case "attention":
      tone = "warning";
      icon = <CircleAlert className="size-4" aria-hidden />;
      title = "Timetable not updated";
      body = error;
      break;
    case "cancelled":
      tone = "neutral";
      icon = <Info className="size-4" aria-hidden />;
      title = "Connection cancelled";
      body = hasSaved ? "Your saved timetable is unchanged." : "Nothing was saved.";
      break;
    case "unsupported":
      tone = "neutral";
      icon = <Smartphone className="size-4" aria-hidden />;
      title = "Connect from the Android app";
      body = hasSaved
        ? "Your saved classes are shown here and on every device. Refreshing needs the Campus Helper Android app."
        : "Connecting to your school account needs the Campus Helper Android app. Classes you save there appear on every device.";
      break;
    default:
      return <div role="status" aria-live="polite" className="sr-only" />;
  }
  return (
    <div
      role={phase === "attention" ? "alert" : "status"}
      aria-live="polite"
      className={cn("flex gap-3 rounded-sm px-4 py-3", tone && MESSAGE_TONE[tone])}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-sm font-semibold">{title}</p>
        {body && <p className="text-body-sm text-text">{body}</p>}
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: KeyRound,
    title: "Sign in on the school page",
    text: "A secure school window opens inside the app. Your password is never stored by Campus Helper.",
  },
  {
    icon: ListChecks,
    title: "Classes are fetched for you",
    text: "Exact teaching weeks, times and rooms are read from your timetable. No file to upload.",
  },
  {
    icon: ShieldCheck,
    title: "Saved to your account",
    text: "School classes appear in My courses and Schedule. Courses you added yourself are kept.",
  },
] as const;

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-2">
      <h2 id="how-heading" className="text-caption tracking-wide text-text-muted uppercase">
        How it works
      </h2>
      <Card className="flex flex-col gap-4">
        <ol className="flex flex-col gap-4">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary-subtle text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-subtitle">{title}</p>
                <p className="text-body-sm text-text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-caption text-text-muted">
          Supports 2026/27 Semester 1. Refresh after timetable changes; it doesn’t sync in the
          background. If your school session expires you’ll be asked to sign in again.
        </p>
      </Card>
    </section>
  );
}

export function ConnectionSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-14 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-36 rounded-md" />
      </Card>
      <Skeleton className="h-48 rounded-md" />
    </div>
  );
}
