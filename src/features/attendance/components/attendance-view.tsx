"use client";
import { useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Info,
  KeyRound,
  QrCode,
  Smartphone,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LocationText,
  Modal,
  Skeleton,
  StatusBadge,
  toast,
  useOffline,
} from "@/components/ui";
import { formatDate, formatTime, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";
import { canCheckIn, classBadge, codeIssue, normaliseCode, orderClasses } from "../rules";
import type { AttendanceClass, CheckInOutcome } from "../types";

export type AttendanceStatus = "loading" | "not-connected" | "signed-out" | "error" | "ready";

export interface AttendanceViewProps {
  status: AttendanceStatus;
  errorMessage?: string;
  /** yyyy-mm-dd, Asia/Shanghai. */
  today: string;
  classes: AttendanceClass[] | null;
  offlineOverride?: boolean;
  onRetry: () => void;
  onSignIn: () => void;
  /** Re-read today's classes and records from AMS. */
  onRefresh: () => void;
  onSubmit: (cls: AttendanceClass, code: string) => Promise<CheckInOutcome>;
}

/** AMS class check-in with the code a teacher shows in class. */
export function AttendanceView(props: AttendanceViewProps) {
  const liveOffline = useOffline();
  const offline = props.offlineOverride ?? liveOffline;
  const [target, setTarget] = useState<AttendanceClass | null>(null);

  if (props.status === "loading") return <AttendanceSkeleton />;
  if (props.status === "not-connected") return <AttendanceNotConnected />;
  if (props.status === "signed-out")
    return (
      <StatusCard
        icon={KeyRound}
        title="Sign in to your school account"
        text="Your classes and attendance records come from AMS. Sign in once inside the app."
        action={
          <Button size="sm" variant="secondary" disabled={offline} onClick={props.onSignIn}>
            Sign in
          </Button>
        }
      />
    );
  if (props.status === "error")
    return (
      <ErrorState
        kind={offline ? "offline" : "server"}
        description={props.errorMessage ?? "We couldn’t load your classes from AMS."}
        onRetry={props.onRetry}
      />
    );

  const classes = props.classes ? orderClasses(props.classes) : null;

  return (
    <div className="flex flex-col gap-6">
      <Card variant="widget" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-event-class-subtle text-event-class">
            <ClipboardCheck className="size-7" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-title">Class check-in</h2>
            <p className="text-body-sm text-text-muted">
              Check in with the code your teacher shows in class.
            </p>
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-sm bg-surface-muted/60 px-3 py-2 text-body-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
          The class code is a short code for this lesson. It’s not your account password.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled aria-describedby="scan-note">
            <QrCode className="size-4" aria-hidden />
            Scan QR code
          </Button>
          <span id="scan-note" className="text-caption text-text-muted">
            Scanning isn’t available yet. Enter the code instead.
          </span>
        </div>
      </Card>

      <section aria-labelledby="today-heading" className="flex flex-col gap-3">
        <div className="-my-2 flex items-center justify-between gap-2">
          <h2 id="today-heading" className="text-caption tracking-wide text-text-muted uppercase">
            Today · {formatDate(`${props.today}T12:00:00+08:00`)}
          </h2>
          <Button size="sm" variant="ghost" disabled={offline} onClick={props.onRefresh}>
            Refresh
          </Button>
        </div>
        {classes === null ? (
          <ClassSkeletons />
        ) : classes.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={ClipboardCheck}
              title="No classes to check in today"
              description="Classes that use AMS check-in appear here on the day."
            />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {classes.map((c) => (
              <li key={c.id}>
                <ClassCard cls={c} offline={offline} onCheckIn={() => setTarget(c)} />
              </li>
            ))}
          </ul>
        )}
        {offline && (
          <p className="text-body-sm text-text-muted">
            Unavailable offline. Reconnect to check in.
          </p>
        )}
      </section>

      {target && (
        <CheckInSheet
          key={target.id}
          cls={target}
          offline={offline}
          onClose={() => setTarget(null)}
          onSubmit={props.onSubmit}
          onSignIn={props.onSignIn}
          onRefresh={() => {
            setTarget(null);
            props.onRefresh();
          }}
        />
      )}
    </div>
  );
}

const range = (c: AttendanceClass) => formatTimeRange(c.startsAt, c.endsAt);

function ClassCard({
  cls,
  offline,
  onCheckIn,
}: {
  cls: AttendanceClass;
  offline: boolean;
  onCheckIn: () => void;
}) {
  const open = canCheckIn(cls);
  return (
    <Card className={cn("flex flex-col gap-3", open && "border-primary")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-event-class-subtle text-event-class">
          <ClipboardCheck className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-subtitle">
            {cls.moduleCode} {cls.name}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-text-muted tabular-nums">
            {range(cls)}
            {cls.location && <LocationText location={cls.location} />}
          </p>
        </div>
        <StatusBadge kind="attendance" status={classBadge(cls)} />
      </div>
      {open ? (
        <Button size="sm" className="self-start" disabled={offline} onClick={onCheckIn}>
          Enter class code
        </Button>
      ) : (
        <p className="text-caption text-text-muted">{explain(cls)}</p>
      )}
    </Card>
  );
}

function explain(c: AttendanceClass) {
  if (c.record === "PRESENT" || c.record === "LATE")
    return c.recordedAt
      ? `Recorded by the school at ${formatTime(c.recordedAt)}.`
      : "Recorded by the school.";
  if (c.record === "ABSENT")
    return "The school recorded you as absent. Contact your teacher if this is wrong.";
  if (c.record === "PENDING")
    return "The school hasn’t confirmed your check-in yet. Refresh in a moment.";
  if (c.window === "NOT_OPEN") return "Check-in opens when your teacher starts it in class.";
  return "Check-in for this class has closed.";
}

function CheckInSheet({
  cls,
  offline,
  onClose,
  onSubmit,
  onSignIn,
  onRefresh,
}: {
  cls: AttendanceClass;
  offline: boolean;
  onClose: () => void;
  onSubmit: AttendanceViewProps["onSubmit"];
  onSignIn: () => void;
  onRefresh: () => void;
}) {
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const issue = touched ? codeIssue(code) : null;
  const fieldError =
    issue ??
    (outcome?.kind === "wrong-code"
      ? (outcome.message ?? "That code wasn’t accepted. Check it with your teacher and try again.")
      : undefined);

  async function submit() {
    setTouched(true);
    if (codeIssue(code) || offline || pending) return;
    setPending(true);
    setOutcome(null);
    try {
      const result = await onSubmit(cls, normaliseCode(code));
      setOutcome(result);
      if (result.kind === "recorded") toast.success("Checked in");
    } catch {
      setOutcome({ kind: "unknown" });
    } finally {
      setPending(false);
    }
  }

  if (outcome?.kind === "recorded" || outcome?.kind === "pending") {
    const recorded = outcome.kind === "recorded";
    return (
      <Modal
        open
        onClose={onClose}
        title={recorded ? "You’re checked in" : "Waiting for the school"}
        description={`${cls.moduleCode} · ${range(cls)}`}
        footer={
          <Button fullWidth className="md:w-auto" onClick={recorded ? onClose : onRefresh}>
            {recorded ? "Done" : "Refresh attendance"}
          </Button>
        }
      >
        <Line
          tone={recorded ? "success" : "warning"}
          text={
            recorded
              ? `AMS recorded you as ${outcome.record === "LATE" ? "late" : "present"} at ${formatTime(outcome.recordedAt)}.`
              : "AMS received your code but hasn’t shown a record yet. Refresh before entering the code again."
          }
        />
      </Modal>
    );
  }

  const blocked = outcome?.kind === "unknown";
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      title="Check in to class"
      description={`${cls.moduleCode} ${cls.name} · ${range(cls)}`}
      footer={
        <>
          <Button
            variant="secondary"
            fullWidth
            className="md:w-auto"
            disabled={pending}
            onClick={onClose}
          >
            Not now
          </Button>
          {blocked ? (
            // The code may already have been recorded; never send it twice blindly.
            <Button fullWidth className="md:w-auto" onClick={onRefresh}>
              Refresh attendance
            </Button>
          ) : (
            <Button
              fullWidth
              className="md:w-auto"
              loading={pending}
              disabled={offline || outcome?.kind === "not-open" || outcome?.kind === "closed"}
              onClick={() => void submit()}
            >
              Check in
            </Button>
          )}
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!blocked) void submit();
        }}
      >
        {outcome?.kind === "unknown" && (
          <Line
            tone="warning"
            text="AMS didn’t confirm whether your check-in was recorded. Refresh your attendance before trying again."
          />
        )}
        {outcome?.kind === "not-open" && (
          <Line
            tone="info"
            text="Check-in hasn’t opened for this class yet. Try again when your teacher starts it."
          />
        )}
        {outcome?.kind === "closed" && (
          <Line
            tone="info"
            text="Check-in for this class has closed. Contact your teacher if you were there."
          />
        )}
        {outcome?.kind === "auth" && (
          <Line
            tone="warning"
            text="Your school session ended. Sign in again, then enter the code. Your code is kept."
            action={
              <Button size="sm" variant="secondary" onClick={onSignIn}>
                Sign in
              </Button>
            }
          />
        )}
        <FormField
          label="Class code"
          hint="The code your teacher shows in class — not your account password."
          error={fieldError}
        >
          <Input
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={24}
            disabled={pending || blocked}
            className="text-title tracking-[0.3em] uppercase"
            onChange={(e) => {
              setCode(e.target.value);
              if (outcome?.kind === "wrong-code") setOutcome(null);
            }}
          />
        </FormField>
        {offline && (
          <p className="text-body-sm text-text-muted">Unavailable offline. Your code is kept.</p>
        )}
      </form>
    </Modal>
  );
}

const LINE_TONE = {
  success: { className: "bg-success-subtle text-success", Icon: CircleCheck },
  warning: { className: "bg-warning-subtle text-warning", Icon: CircleAlert },
  info: { className: "bg-info-subtle text-info", Icon: Info },
} as const;

function Line({
  tone,
  text,
  action,
}: {
  tone: keyof typeof LINE_TONE;
  text: string;
  action?: React.ReactNode;
}) {
  const { className, Icon } = LINE_TONE[tone];
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-sm px-3 py-3", className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <p className="text-body-sm text-text">{text}</p>
        {action}
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof KeyRound;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <Card variant="widget" className="flex flex-col items-start gap-3">
      <span className="flex size-12 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <Icon className="size-6" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-1">
        <h2 className="text-title">{title}</h2>
        <p className="text-body-sm text-text-muted">{text}</p>
      </div>
      {action}
    </Card>
  );
}

/** Real route until the AMS adapter and facade land. */
export function AttendanceNotConnected() {
  return (
    <StatusCard
      icon={Smartphone}
      title="Class check-in isn’t connected yet"
      text="Checking in to AMS with a class code is coming to the Campus Helper Android app. Until then, use the university’s own attendance page."
    />
  );
}

function ClassSkeletons() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </Card>
      ))}
    </div>
  );
}

export function AttendanceSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-14 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 rounded-sm" />
      </Card>
      <ClassSkeletons />
    </div>
  );
}
