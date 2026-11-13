"use client";
import { useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  DoorOpen,
  KeyRound,
  Plus,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  ConfirmDialog,
  DateStrip,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  Input,
  Modal,
  Skeleton,
  StatusBadge,
  TimeSlotButton,
  toast,
  useOffline,
} from "@/components/ui";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  MEMBER_ISSUE_TEXT,
  durationOptions,
  formatMinutes,
  freeRanges,
  fromMinutes,
  memberIssues,
  partyIssue,
  partySize,
  ruleLines,
  startOptions,
  toMinutes,
} from "../rules";
import type {
  BookingDraft,
  BookingOutcome,
  Floor,
  Reservation,
  RoomAvailability,
  RoomRules,
} from "../types";

export type RoomsStatus =
  "loading" | "not-connected" | "signed-out" | "gateway-blocked" | "error" | "ready";

export interface RoomsViewProps {
  status: RoomsStatus;
  errorMessage?: string;
  rules: RoomRules | null;
  floors: Floor[];
  /** yyyy-mm-dd, Asia/Shanghai, passed in by the page. */
  today: string;
  floorId: string;
  date: string;
  /** null while loading this floor and date. */
  availability: RoomAvailability[] | null;
  reservations: Reservation[] | null;
  selfId: string | null;
  /** Lets a preview force the offline state. */
  offlineOverride?: boolean;
  onFloorChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onRetry: () => void;
  onSignIn: () => void;
  onSubmit: (draft: BookingDraft) => Promise<BookingOutcome>;
  onCancel: (reservation: Reservation) => Promise<"cancelled" | "unknown" | "rejected">;
  /** Re-read My reservations from the school (after an unconfirmed result). */
  onRefreshReservations: () => void;
}

const dayLabel = (date: string) => formatDate(`${date}T12:00:00+08:00`);
const REASON: Record<string, string> = { BOOKED: "Booked", PAST: "Past", CLOSED: "Closed" };

/** Taicang discussion rooms: choose floor, date, room and time, then members. */
export function RoomsView(props: RoomsViewProps) {
  const liveOffline = useOffline();
  const offline = props.offlineOverride ?? liveOffline;
  const [choosing, setChoosing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    room: RoomAvailability;
    start: string;
    minutes: number;
  } | null>(null);

  if (props.status === "loading") return <RoomsSkeleton />;
  if (props.status === "not-connected") return <NotConnected />;
  if (props.status === "signed-out")
    return (
      <StatusCard
        icon={KeyRound}
        title="Sign in to your school account"
        text="Room availability comes live from the school. Sign in once inside the app to see rooms and your reservations."
        action={
          <Button size="sm" variant="secondary" disabled={offline} onClick={props.onSignIn}>
            Sign in
          </Button>
        }
      />
    );
  if (props.status === "gateway-blocked")
    return (
      <StatusCard
        icon={ShieldAlert}
        tone="warning"
        title="The school didn’t let us in"
        text="The room system asked for a sign-in or blocked the request, so we can’t show availability. This doesn’t mean rooms are full."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={offline} onClick={props.onSignIn}>
              Sign in again
            </Button>
            <Button size="sm" variant="ghost" disabled={offline} onClick={props.onRetry}>
              Try again
            </Button>
          </div>
        }
      />
    );
  if (props.status === "error" || !props.rules)
    return (
      <ErrorState
        kind={offline ? "offline" : "server"}
        description={props.errorMessage ?? "We couldn’t load discussion rooms."}
        onRetry={props.onRetry}
      />
    );

  const rules = props.rules;
  const floor = props.floors.find((f) => f.id === props.floorId);

  return (
    <div className="flex flex-col gap-6">
      <Card variant="widget" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-event-space-subtle text-event-space">
            <DoorOpen className="size-7" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-title">Discussion rooms</h2>
            <p className="text-body-sm text-text-muted">
              Book a room for your group at Taicang campus.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium" aria-hidden>
            Floor
          </span>
          <ChipGroup label="Floor">
            {props.floors.map((f) => (
              <Chip
                key={f.id}
                selected={f.id === props.floorId}
                onClick={() => {
                  setChoosing(null);
                  props.onFloorChange(f.id);
                }}
              >
                {f.label}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <DateStrip
          name="date"
          label="Date"
          start={props.today}
          days={rules.maxDaysAhead + 1}
          defaultValue={props.date}
          onChange={(value) => {
            setChoosing(null);
            props.onDateChange(value);
          }}
        />
        <RuleSummary rules={rules} />
      </Card>

      <section aria-labelledby="rooms-heading" className="flex flex-col gap-3">
        <h2 id="rooms-heading" className="text-caption tracking-wide text-text-muted uppercase">
          {floor ? `${floor.label} · ${dayLabel(props.date)}` : "Rooms"}
        </h2>
        {props.availability === null ? (
          <CardSkeletons />
        ) : props.availability.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={DoorOpen}
              title="No rooms listed"
              description="The school lists no bookable rooms on this floor for this date. Try another floor or date."
            />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {props.availability.map((a) => (
              <li key={a.room.id}>
                <RoomCard
                  availability={a}
                  rules={rules}
                  open={choosing === a.room.id}
                  disabled={offline}
                  onToggle={() => setChoosing((id) => (id === a.room.id ? null : a.room.id))}
                  onChoose={(start, minutes) => setDraft({ room: a, start, minutes })}
                />
              </li>
            ))}
          </ul>
        )}
        {offline && (
          <p className="text-body-sm text-text-muted">
            Unavailable offline. Reconnect to book a room.
          </p>
        )}
      </section>

      <MyReservations
        reservations={props.reservations}
        offline={offline}
        onCancel={props.onCancel}
      />

      {draft && (
        <BookingSheet
          key={`${draft.room.room.id}-${draft.start}-${draft.minutes}`}
          room={draft.room}
          date={props.date}
          start={draft.start}
          minutes={draft.minutes}
          rules={rules}
          selfId={props.selfId}
          offline={offline}
          onClose={() => setDraft(null)}
          onSubmit={props.onSubmit}
          onBooked={() => setChoosing(null)}
          onSignIn={props.onSignIn}
          onCheckReservations={() => {
            setDraft(null);
            setChoosing(null);
            props.onRefreshReservations();
            document
              .getElementById("reservations-heading")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}
    </div>
  );
}

function RuleSummary({ rules }: { rules: RoomRules }) {
  return (
    <details className="group rounded-sm bg-surface-muted/60 px-3 py-2 text-body-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <Users className="size-4 shrink-0 text-text-muted" aria-hidden />
        {rules.minPeople}–{rules.maxPeople} people · {formatMinutes(rules.minMinutes)}–
        {formatMinutes(rules.maxMinutes)} · {rules.opensAt}–{rules.closesAt}
        <span className="ml-auto text-primary group-open:hidden">Rules</span>
        <span className="ml-auto hidden text-primary group-open:inline">Hide</span>
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-text-muted">
        {ruleLines(rules).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-text-muted">
        Rules come from the school and can change.
      </p>
    </details>
  );
}

/** Day overview: one cell per booking step; free cells in the service colour. */
function AvailabilityBar({ availability }: { availability: RoomAvailability }) {
  return (
    <div aria-hidden className="flex h-2.5 w-full gap-px overflow-hidden rounded-full">
      {availability.slots.map((s) => (
        <span
          key={s.start}
          className={cn("flex-1", s.available ? "bg-event-space" : "bg-surface-muted")}
        />
      ))}
    </div>
  );
}

function RoomCard({
  availability,
  rules,
  open,
  disabled,
  onToggle,
  onChoose,
}: {
  availability: RoomAvailability;
  rules: RoomRules;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChoose: (start: string, minutes: number) => void;
}) {
  const [start, setStart] = useState<string | null>(null);
  const { room, slots } = availability;
  const starts = startOptions(slots, rules);
  const ranges = freeRanges(slots);
  const lengths = start ? durationOptions(slots, start, rules) : [];
  const panelId = `room-${room.id}-times`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-subtitle">{room.name}</h3>
          <p className="text-body-sm text-text-muted">
            {room.capacity ? `Up to ${room.capacity} people · ` : ""}
            {ranges.length ? `Free ${ranges.join(", ")}` : "Fully booked"}
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? "ghost" : "secondary"}
          disabled={starts.length === 0 || disabled}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setStart(null);
            onToggle();
          }}
        >
          {open ? "Close" : "Choose time"}
        </Button>
      </div>
      <AvailabilityBar availability={availability} />
      <div className="flex justify-between text-caption text-text-muted tabular-nums" aria-hidden>
        <span>{rules.opensAt}</span>
        <span>{rules.closesAt}</span>
      </div>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-body-sm font-medium" id={`${panelId}-start`}>
            Start time
          </p>
          <div
            role="group"
            aria-labelledby={`${panelId}-start`}
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
          >
            {slots.map((s) => {
              const usable = starts.some((o) => o.start === s.start);
              return (
                <TimeSlotButton
                  key={s.start}
                  label={s.start}
                  selected={start === s.start}
                  unavailableReason={usable ? undefined : (REASON[s.reason ?? ""] ?? "Too short")}
                  onClick={() => setStart(s.start)}
                />
              );
            })}
          </div>
          {start && (
            <>
              <p className="text-body-sm font-medium" id={`${panelId}-length`}>
                Length
              </p>
              <ChipGroup label="Length">
                {lengths.map((m) => (
                  <Chip
                    key={m}
                    onClick={() => onChoose(start, m)}
                    aria-label={`${formatMinutes(m)}, until ${fromMinutes(toMinutes(start) + m)}`}
                  >
                    {formatMinutes(m)}
                  </Chip>
                ))}
              </ChipGroup>
              <p className="text-caption text-text-muted">
                Choose a length to add your group and confirm.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function BookingSheet({
  room,
  date,
  start,
  minutes,
  rules,
  selfId,
  offline,
  onClose,
  onSubmit,
  onBooked,
  onSignIn,
  onCheckReservations,
}: {
  room: RoomAvailability;
  date: string;
  start: string;
  minutes: number;
  rules: RoomRules;
  selfId: string | null;
  offline: boolean;
  onClose: () => void;
  onSubmit: (draft: BookingDraft) => Promise<BookingOutcome>;
  onBooked: () => void;
  onSignIn: () => void;
  onCheckReservations: () => void;
}) {
  const [members, setMembers] = useState<string[]>(() =>
    Array.from({ length: Math.max(0, rules.minPeople - 1) }, () => ""),
  );
  const [touched, setTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<BookingOutcome | null>(null);
  const end = fromMinutes(toMinutes(start) + minutes);
  const issues = memberIssues(members, selfId);
  const party = partyIssue(members, rules);
  const valid = issues.every((i) => i === null) && !party && accepted;
  const when = `${dayLabel(date)}, ${start}–${end}`;

  async function submit() {
    setTouched(true);
    if (!valid || offline || pending) return;
    setPending(true);
    try {
      const result = await onSubmit({
        roomId: room.room.id,
        date,
        start,
        minutes,
        memberIds: members.map((m) => m.trim()),
      });
      setOutcome(result);
      if (result.kind === "confirmed") {
        toast.success("Room booked");
        onBooked();
      }
    } catch {
      setOutcome({ kind: "unknown" });
    } finally {
      setPending(false);
    }
  }

  if (outcome && (outcome.kind === "confirmed" || outcome.kind === "awaiting")) {
    return (
      <Modal
        open
        onClose={onClose}
        title={outcome.kind === "confirmed" ? "Room booked" : "Waiting for the school"}
        footer={
          <Button fullWidth className="md:w-auto" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <OutcomeLine
            tone={outcome.kind === "confirmed" ? "success" : "warning"}
            text={
              outcome.kind === "confirmed"
                ? "The school confirmed your reservation. It’s listed under My reservations."
                : "The school received your request but hasn’t confirmed it yet. Check My reservations before booking again."
            }
          />
          <BookingSummary
            room={outcome.reservation.roomName}
            when={`${dayLabel(outcome.reservation.date)}, ${outcome.reservation.start}–${outcome.reservation.end}`}
            members={outcome.reservation.members}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      title={`Book ${room.room.name}`}
      description={when}
      footer={
        <>
          <Button
            variant="secondary"
            fullWidth
            className="md:w-auto"
            disabled={pending}
            onClick={onClose}
          >
            Back to rooms
          </Button>
          {outcome?.kind === "unknown" ? (
            // Never offer a second submit while the first result is unconfirmed.
            <Button fullWidth className="md:w-auto" onClick={onCheckReservations}>
              Check my reservations
            </Button>
          ) : (
            <Button
              fullWidth
              className="md:w-auto"
              loading={pending}
              disabled={offline || (touched && !valid)}
              onClick={() => void submit()}
            >
              Book room
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {outcome && <OutcomeFailure outcome={outcome} onSignIn={onSignIn} />}

        <section className="flex flex-col gap-3" aria-labelledby="members-heading">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="members-heading" className="text-subtitle">
              Your group
            </h3>
            <span className="text-body-sm text-text-muted tabular-nums">
              {partySize(members)} of {rules.minPeople}–{rules.maxPeople} people
            </span>
          </div>
          <p className="text-body-sm text-text-muted">
            You’re included. Add the student IDs of the others joining you.
          </p>
          <ul className="flex flex-col gap-3">
            {members.map((value, i) => {
              const issue = touched ? issues[i] : null;
              return (
                <li key={i} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FormField
                      label={`Member ${i + 1} student ID`}
                      error={issue ? MEMBER_ISSUE_TEXT[issue] : undefined}
                    >
                      <Input
                        inputMode="numeric"
                        autoComplete="off"
                        value={value}
                        disabled={pending}
                        onChange={(e) =>
                          setMembers((list) => list.map((v, j) => (j === i ? e.target.value : v)))
                        }
                      />
                    </FormField>
                  </div>
                  <IconButton
                    aria-label={`Remove member ${i + 1}`}
                    className="mt-7 [&_svg]:size-5"
                    disabled={pending}
                    onClick={() => setMembers((list) => list.filter((_, j) => j !== i))}
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </li>
              );
            })}
          </ul>
          {partySize(members) < rules.maxPeople && (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              disabled={pending}
              onClick={() => setMembers((list) => [...list, ""])}
            >
              <Plus className="size-4" aria-hidden />
              Add member
            </Button>
          )}
          {touched && party && (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-danger">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {party}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2" aria-labelledby="rules-heading">
          <h3 id="rules-heading" className="text-subtitle">
            Room rules
          </h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-text-muted">
            {ruleLines(rules).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <label className="flex items-start gap-3 rounded-sm bg-surface-muted px-3 py-3 text-body-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-primary"
              checked={accepted}
              disabled={pending}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I’ll follow these rules and check in on time with my group.
          </label>
          {touched && !accepted && (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-danger">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              Confirm the room rules to book.
            </p>
          )}
        </section>

        {offline && (
          <p className="text-body-sm text-text-muted">
            Unavailable offline. Your entries are kept.
          </p>
        )}
      </div>
    </Modal>
  );
}

function OutcomeFailure({ outcome, onSignIn }: { outcome: BookingOutcome; onSignIn: () => void }) {
  if (outcome.kind === "conflict")
    return <OutcomeLine tone="danger" text={`${outcome.message} Your group is kept.`} />;
  if (outcome.kind === "rejected") return <OutcomeLine tone="danger" text={outcome.message} />;
  if (outcome.kind === "auth")
    return (
      <OutcomeLine
        tone="warning"
        text="Your school session ended. Sign in again, then book. Your group is kept."
        action={
          <Button size="sm" variant="secondary" onClick={onSignIn}>
            Sign in
          </Button>
        }
      />
    );
  if (outcome.kind === "unknown")
    return (
      <OutcomeLine
        tone="warning"
        text="The school hasn’t confirmed whether this room was booked. Check My reservations before trying again."
      />
    );
  return null;
}

const OUTCOME_TONE = {
  success: { className: "bg-success-subtle text-success", Icon: CircleCheck },
  warning: { className: "bg-warning-subtle text-warning", Icon: CircleAlert },
  danger: { className: "bg-danger-subtle text-danger", Icon: CircleAlert },
} as const;

function OutcomeLine({
  tone,
  text,
  action,
}: {
  tone: keyof typeof OUTCOME_TONE;
  text: string;
  action?: React.ReactNode;
}) {
  const { className, Icon } = OUTCOME_TONE[tone];
  return (
    <div
      role={tone === "success" ? "status" : "alert"}
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

function BookingSummary({
  room,
  when,
  members,
}: {
  room: string;
  when: string;
  members: string[];
}) {
  return (
    <dl className="flex flex-col divide-y divide-border rounded-sm bg-surface-muted px-3 text-body-sm">
      <div className="flex gap-3 py-2">
        <dt className="text-text-muted">Room</dt>
        <dd className="ml-auto text-right">{room}</dd>
      </div>
      <div className="flex gap-3 py-2">
        <dt className="text-text-muted">Time</dt>
        <dd className="ml-auto text-right tabular-nums">{when}</dd>
      </div>
      <div className="flex gap-3 py-2">
        <dt className="text-text-muted">Group</dt>
        <dd className="ml-auto text-right">{members.join(", ")}</dd>
      </div>
    </dl>
  );
}

function MyReservations({
  reservations,
  offline,
  onCancel,
}: {
  reservations: Reservation[] | null;
  offline: boolean;
  onCancel: RoomsViewProps["onCancel"];
}) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [failure, setFailure] = useState("");

  async function confirm() {
    if (!target) return;
    setFailure("");
    const result = await onCancel(target);
    if (result === "cancelled") {
      setTarget(null);
      toast.success("Reservation cancelled");
      return;
    }
    setFailure(
      result === "unknown"
        ? "The school hasn’t confirmed the cancellation. Check My reservations before trying again."
        : "The school didn’t accept this cancellation. The reservation is unchanged.",
    );
  }

  return (
    <section aria-labelledby="reservations-heading" className="flex flex-col gap-3">
      <h2
        id="reservations-heading"
        className="text-caption tracking-wide text-text-muted uppercase"
      >
        My reservations
      </h2>
      {reservations === null ? (
        <CardSkeletons count={1} />
      ) : reservations.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={DoorOpen}
            title="No room reservations"
            description="Rooms you book appear here with their group and status."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {reservations.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-event-space-subtle text-event-space">
                    <DoorOpen className="size-5" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="text-subtitle">{r.roomName}</h3>
                    <p className="text-body-sm text-text-muted tabular-nums">
                      {dayLabel(r.date)}, {r.start}–{r.end}
                    </p>
                  </div>
                  <StatusBadge kind="reservation" status={r.status} />
                </div>
                <p className="flex items-start gap-2 text-body-sm">
                  <Users className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                  {r.members.join(", ")}
                </p>
                {r.status !== "CANCELLED" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!r.cancellable || offline}
                      onClick={() => {
                        setFailure("");
                        setTarget(r);
                      }}
                    >
                      Cancel reservation
                    </Button>
                    {!r.cancellable && (
                      <span className="flex items-center gap-1.5 text-caption text-text-muted">
                        <Clock className="size-3.5" aria-hidden />
                        The school no longer allows cancelling this reservation.
                      </span>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        title="Cancel this reservation?"
        description={
          target && (
            <>
              {target.roomName} · {dayLabel(target.date)}, {target.start}–{target.end}. The room
              will be released for other students.
              {failure && (
                <span role="alert" className="mt-2 block text-danger">
                  {failure}
                </span>
              )}
            </>
          )
        }
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        onConfirm={confirm}
      />
    </section>
  );
}

function StatusCard({
  icon: Icon,
  title,
  text,
  action,
  tone = "neutral",
}: {
  icon: typeof KeyRound;
  title: string;
  text: string;
  action?: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <Card variant="widget" className="flex flex-col items-start gap-3">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-md",
          tone === "warning" ? "bg-warning-subtle text-warning" : "bg-primary-subtle text-primary",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1" role={tone === "warning" ? "alert" : "status"}>
        <h2 className="text-title">{title}</h2>
        <p className="text-body-sm text-text-muted">{text}</p>
      </div>
      {action}
    </Card>
  );
}

/** Shown on the real route until the school adapter is connected. */
export function NotConnected() {
  return (
    <StatusCard
      icon={Smartphone}
      title="Room booking isn’t connected yet"
      text="Booking Taicang discussion rooms with your school account is coming to the Campus Helper Android app. Until then, book through the university’s own system."
    />
  );
}

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </Card>
      ))}
    </div>
  );
}

export function RoomsSkeleton() {
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
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-16 rounded-sm" />
      </Card>
      <CardSkeletons />
    </div>
  );
}
