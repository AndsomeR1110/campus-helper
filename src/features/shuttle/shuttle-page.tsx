"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Bus,
  CircleAlert,
  CircleCheck,
  Clock,
  Info,
  KeyRound,
  MapPin,
  QrCode,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  ConfirmDialog,
  DatePicker,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  Skeleton,
  StatusBadge,
  toast,
  useOffline,
} from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BoardingPass } from "./boarding-pass";
import { SchoolAccountSignIn, schoolAuthAvailable } from "@/features/school-auth";
import { shuttle, shuttleAvailable, shuttleError } from "./bridge";
import type { Schedule, Trip } from "./schemas";
import {
  ROUTES,
  campusShort,
  failureKind,
  heldTrip,
  journeyDuration,
  journeyEnd,
  journeyStart,
  sortTrips,
  type Route,
} from "./view-model";

const subscribe = () => () => {};
const dayLabel = (date: string) => formatDate(`${date}T12:00:00+08:00`);
const timeRange = (j: Schedule | Trip) => formatTimeRange(journeyStart(j), journeyEnd(j));
const routeText = (j: Schedule | Trip) => `${campusShort(j.from)} → ${campusShort(j.to)}`;

/** No school request is made until a connection is confirmed for this app account. */
type Account = "not-connected" | "connected" | "expired";
type Busy = null | "search" | "trips" | "write";
type Notice = { tone: "success" | "warning" | "info"; title: string; text: string } | null;

// The sign-in sheet needs both native plugins; there is no whole-page fallback.
const nativeReady = () => shuttleAvailable() && schoolAuthAvailable();

export function ShuttlePage({ initialDate, actorId }: { initialDate: string; actorId: string }) {
  const offline = useOffline();
  const available = useSyncExternalStore(subscribe, nativeReady, () => null);
  const [date, setDate] = useState(initialDate);
  const [route, setRoute] = useState<Route>(2);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [searched, setSearched] = useState<{ date: string; route: Route } | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [account, setAccount] = useState<Account>("not-connected");
  const [signingIn, setSigningIn] = useState(false);
  // The school bridge has a single request channel: one request at a time.
  const [busy, setBusy] = useState<Busy>(null);
  const [searchError, setSearchError] = useState("");
  const [tripsError, setTripsError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [booking, setBooking] = useState<Schedule | null>(null);
  const [cancelling, setCancelling] = useState<Trip | null>(null);
  const [dialogFailure, setDialogFailure] = useState("");
  const [pass, setPass] = useState<Trip | null>(null);
  const active = useRef(true);
  const running = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  // Bring a new outcome into view; it may appear above where the user is.
  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [notice]);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  /** Serialises bridge requests; returns false if another one is running. */
  async function exclusive(kind: NonNullable<Busy>, action: () => Promise<void>) {
    if (running.current) return false;
    running.current = true;
    setBusy(kind);
    try {
      await action();
    } finally {
      running.current = false;
      if (active.current) setBusy(null);
    }
    return true;
  }

  /** Read-only: the user's actionable school trips. */
  async function readTrips() {
    try {
      const result = await shuttle.trips();
      if (!active.current) return null;
      setTrips(result);
      setTripsError("");
      setAccount("connected");
      return result;
    } catch (e) {
      if (!active.current) return null;
      if (failureKind(e) === "auth") {
        setAccount("expired");
        setTrips(null);
      } else setTripsError(shuttleError(e));
      return null;
    }
  }

  const loadTrips = () =>
    exclusive("trips", async () => {
      await readTrips();
    });

  function signIn() {
    if (running.current) return;
    setNotice(null);
    setSigningIn(true);
  }

  function search() {
    void exclusive("search", async () => {
      setSearchError("");
      setNotice(null);
      try {
        const result = await shuttle.schedules(date, route);
        if (!active.current) return;
        setSchedules(result);
        setSearched({ date, route });
        setAccount("connected");
      } catch (e) {
        if (!active.current) return;
        setSchedules(null);
        if (failureKind(e) === "auth") setAccount("expired");
        else setSearchError(shuttleError(e));
        return;
      }
      await readTrips();
    });
  }

  /**
   * A failed booking or cancellation. Unknown or stale results close the
   * dialog and re-read My trips — the write is never retried. Other failures
   * stay in the dialog so the user's selection is kept.
   */
  async function writeFailed(e: unknown, close: () => void) {
    const kind = failureKind(e);
    if (kind !== "unknown-result" && kind !== "stale" && kind !== "auth") {
      setDialogFailure(shuttleError(e));
      return;
    }
    close();
    setNotice({
      tone: "warning",
      title:
        kind === "unknown-result"
          ? "Result not confirmed"
          : kind === "auth"
            ? "Connect again"
            : "Trip changed at the school",
      text:
        kind === "unknown-result"
          ? "The school hasn’t confirmed this change. My trips has been refreshed — check it before trying again."
          : shuttleError(e),
    });
    if (kind === "auth") setAccount("expired");
    else await readTrips();
  }

  async function confirmBooking() {
    const target = booking;
    if (!target || offline) return;
    const ran = await exclusive("write", async () => {
      setDialogFailure("");
      let confirmed: Trip;
      try {
        confirmed = (await shuttle.book(target)).trip;
      } catch (e) {
        await writeFailed(e, () => setBooking(null));
        return;
      }
      setBooking(null);
      // Success is shown only once the trip is read back from the school.
      const latest = await readTrips();
      const listed = Boolean(latest?.some((t) => t.id === confirmed.id));
      setNotice(
        listed
          ? {
              tone: "success",
              title: "Shuttle booked",
              text: `${dayLabel(confirmed.date)}, ${timeRange(confirmed)} · ${routeText(confirmed)}`,
            }
          : {
              tone: "warning",
              title: "Booking not listed yet",
              text: "The school accepted the booking but it isn’t in My trips yet. Refresh My trips in a moment before booking again.",
            },
      );
      if (listed) toast.success("Shuttle booked");
    });
    if (!ran) setDialogFailure("Another school request is in progress. Try again shortly.");
  }

  async function confirmCancel() {
    const target = cancelling;
    if (!target || offline) return;
    const ran = await exclusive("write", async () => {
      setDialogFailure("");
      try {
        await shuttle.cancel(target);
      } catch (e) {
        await writeFailed(e, () => setCancelling(null));
        return;
      }
      setCancelling(null);
      const latest = await readTrips();
      const gone = latest !== null && !latest.some((t) => t.id === target.id);
      setNotice(
        gone
          ? {
              tone: "success",
              title: "Trip cancelled",
              text: `${dayLabel(target.date)}, ${timeRange(target)} · ${routeText(target)}`,
            }
          : {
              tone: "warning",
              title: "Cancellation not shown yet",
              text: "The school accepted the cancellation but the trip is still listed. Refresh My trips in a moment.",
            },
      );
      if (gone) toast.success("Trip cancelled");
    });
    if (!ran) setDialogFailure("Another school request is in progress. Try again shortly.");
  }

  if (available === null) return <ShuttleSkeleton />;
  if (!available) return <Unsupported />;

  const locked = busy !== null || offline || pass !== null || signingIn;
  const selected = ROUTES.find((r) => r.route === route)!;

  return (
    <div className="flex flex-col gap-6">
      {signingIn && (
        <SchoolAccountSignIn
          actorId={actorId}
          service="shuttle"
          onClose={() => setSigningIn(false)}
          onConnected={() => {
            // Connected only after the shuttle session was read back natively.
            setAccount("connected");
            setSchedules(null);
            setSearched(null);
            void loadTrips();
          }}
        />
      )}
      <Card variant="widget" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <Bus className="size-7" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-title">Between campuses</h2>
            <p className="text-body-sm text-text-muted">
              Find a departure, book it and board with your live pass.
            </p>
          </div>
        </div>

        <AccountRow account={account} loading={signingIn} disabled={locked} onSignIn={signIn} />

        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium" aria-hidden>
            Direction
          </span>
          <ChipGroup label="Direction">
            {ROUTES.map((r) => (
              <Chip
                key={r.route}
                selected={route === r.route}
                disabled={busy !== null}
                onClick={() => {
                  setRoute(r.route);
                  setSchedules(null);
                  setSearched(null);
                }}
              >
                {r.from} → {r.to}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <FormField label="Departure date">
          <DatePicker
            disabled={busy !== null}
            min="today"
            value={date}
            onChange={(value) => {
              setDate(value);
              setSchedules(null);
              setSearched(null);
            }}
          />
        </FormField>
        <Button
          size="lg"
          fullWidth
          disabled={locked || !date || account !== "connected"}
          loading={busy === "search"}
          onClick={search}
        >
          Find departures
        </Button>
        {offline && (
          <p className="text-body-sm text-text-muted">
            Unavailable offline. Reconnect to search and book.
          </p>
        )}
        <p className="text-caption text-text-muted">
          Seats, booking windows and cancellation follow the school’s live rules. Book only if you
          intend to travel.
        </p>
      </Card>

      {notice && (
        <div ref={noticeRef} className="scroll-mt-20">
          <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      )}

      <section aria-labelledby="departures-heading" className="flex flex-col gap-3">
        <SectionHeading id="departures-heading">
          {searched
            ? `Departures · ${dayLabel(searched.date)} · ${selected.from} → ${selected.to}`
            : "Departures"}
        </SectionHeading>
        <Departures
          loading={busy === "search"}
          error={searchError}
          signedOut={account !== "connected" && schedules === null}
          schedules={schedules}
          trips={trips}
          disabled={locked}
          onRetry={search}
          onBook={(s) => {
            setDialogFailure("");
            setBooking(s);
          }}
        />
      </section>

      <section aria-labelledby="trips-heading" className="flex flex-col gap-3">
        <div className="-my-2 flex items-center justify-between gap-2">
          <SectionHeading id="trips-heading">My trips</SectionHeading>
          <IconButton
            aria-label="Refresh my trips"
            disabled={locked}
            onClick={() => void loadTrips()}
            className="[&_svg]:size-5"
          >
            <RefreshCw className={cn(busy === "trips" && "animate-spin")} aria-hidden />
          </IconButton>
        </div>
        <MyTrips
          loading={busy === "trips" && trips === null}
          error={tripsError}
          account={account}
          trips={trips}
          disabled={locked}
          onRetry={() => void loadTrips()}
          onPass={setPass}
          onCancel={(t) => {
            setDialogFailure("");
            setCancelling(t);
          }}
        />
      </section>

      <ConfirmDialog
        open={!!booking}
        onClose={() => setBooking(null)}
        tone="primary"
        title="Book this shuttle?"
        description={
          booking && (
            <>
              <JourneySummary journey={booking} />
              <span className="mt-3 block">
                The school will reserve a seat in your name. Confirm only if you intend to travel.
              </span>
              <DialogFailure message={dialogFailure} />
            </>
          )
        }
        confirmLabel="Confirm booking"
        cancelLabel="Not now"
        onConfirm={confirmBooking}
      />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this trip?"
        description={
          cancelling && (
            <>
              <JourneySummary journey={cancelling} />
              <span className="mt-3 block">
                Your school booking will be cancelled and the seat released. You’ll need to book
                again to take this trip.
              </span>
              <DialogFailure message={dialogFailure} />
            </>
          )
        }
        confirmLabel="Cancel trip"
        cancelLabel="Keep trip"
        onConfirm={confirmCancel}
      />
      {pass && (
        <BoardingPass
          trip={pass}
          onClose={() => {
            setPass(null);
            // The school may have changed the trip (e.g. boarded); re-read it.
            void loadTrips();
          }}
        />
      )}
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-caption tracking-wide text-text-muted uppercase">
      {children}
    </h2>
  );
}

function AccountRow({
  account,
  loading,
  disabled,
  onSignIn,
}: {
  account: Account;
  loading: boolean;
  disabled: boolean;
  onSignIn: () => void;
}) {
  if (account === "connected")
    return (
      <p className="flex items-center gap-2 rounded-sm bg-surface-muted/60 px-3 py-2 text-body-sm">
        <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
        University account connected
      </p>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm bg-surface-muted/60 px-3 py-2">
      <KeyRound className="size-4 shrink-0 text-text-muted" aria-hidden />
      <p className="min-w-0 flex-1 text-body-sm">
        {account === "expired"
          ? "Your university session ended. Connect again to continue."
          : "Connect your university account to search and book."}
      </p>
      <Button
        size="sm"
        variant="secondary"
        loading={loading}
        disabled={disabled}
        onClick={onSignIn}
      >
        {account === "expired" ? "Reconnect" : "Connect"}
      </Button>
    </div>
  );
}

const NOTICE_STYLE = {
  success: { className: "bg-success-subtle text-success", Icon: CircleCheck },
  warning: { className: "bg-warning-subtle text-warning", Icon: CircleAlert },
  info: { className: "bg-info-subtle text-info", Icon: Info },
} as const;

function NoticeBanner({
  notice,
  onDismiss,
}: {
  notice: NonNullable<Notice>;
  onDismiss: () => void;
}) {
  const { className, Icon } = NOTICE_STYLE[notice.tone];
  return (
    <div
      role={notice.tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md px-4 py-3", className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-sm font-semibold">{notice.title}</p>
        <p className="text-body-sm text-text">{notice.text}</p>
      </div>
      <Button size="sm" variant="ghost" className="-my-1" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}

function Departures({
  loading,
  error,
  signedOut,
  schedules,
  trips,
  disabled,
  onRetry,
  onBook,
}: {
  loading: boolean;
  error: string;
  signedOut: boolean;
  schedules: Schedule[] | null;
  trips: Trip[] | null;
  disabled: boolean;
  onRetry: () => void;
  onBook: (s: Schedule) => void;
}) {
  if (loading) return <CardSkeletons />;
  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (signedOut)
    return (
      <p className="text-body-sm text-text-muted">
        Connect your university account above to see live departures.
      </p>
    );
  if (schedules === null)
    return (
      <p className="text-body-sm text-text-muted">
        Choose a direction and date, then find departures.
      </p>
    );
  if (schedules.length === 0)
    return (
      <Card className="p-0">
        <EmptyState
          icon={Bus}
          title="No departures to book"
          description="The school lists no bookable departures for this date and direction. Try another date or direction."
        />
      </Card>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {schedules.map((s) => {
        const held = heldTrip(s, trips);
        const duration = journeyDuration(s);
        return (
          <li key={s.id}>
            <Card className="flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <p className="text-title tabular-nums">{timeRange(s)}</p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-body-sm text-text-muted">
                    {campusShort(s.from)}
                    <ArrowRight className="size-4" aria-label="to" />
                    {campusShort(s.to)}
                    {duration && <span aria-hidden>·</span>}
                    {duration && <span>{duration}</span>}
                  </p>
                </div>
                {held ? (
                  <StatusBadge kind="booking" status="CONFIRMED" />
                ) : (
                  <Button
                    size="sm"
                    disabled={disabled}
                    onClick={() => onBook(s)}
                    aria-label={`Book ${timeRange(s)}, ${routeText(s)}`}
                  >
                    Book
                  </Button>
                )}
              </div>
              <p className="flex items-start gap-2 text-body-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                <span>{s.pickup || "Pick-up point shown by the school when you book"}</span>
              </p>
              {held && (
                <p className="text-caption text-text-muted">
                  You already have this trip in My trips.
                </p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function MyTrips({
  loading,
  error,
  account,
  trips,
  disabled,
  onRetry,
  onPass,
  onCancel,
}: {
  loading: boolean;
  error: string;
  account: Account;
  trips: Trip[] | null;
  disabled: boolean;
  onRetry: () => void;
  onPass: (t: Trip) => void;
  onCancel: (t: Trip) => void;
}) {
  if (loading) return <CardSkeletons count={1} />;
  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (account !== "connected")
    return (
      <p className="text-body-sm text-text-muted">
        Your shuttle bookings appear here after you connect your university account.
      </p>
    );
  if (trips === null)
    return <p className="text-body-sm text-text-muted">Refresh to load your school bookings.</p>;
  if (trips.length === 0)
    return (
      <Card className="p-0">
        <EmptyState
          icon={Bus}
          title="No upcoming trips"
          description="Trips you book appear here with their boarding pass."
        />
      </Card>
    );
  return (
    <ul className="flex flex-col gap-3">
      {sortTrips(trips).map((t) => (
        <li key={t.id}>
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent-subtle text-accent">
                <Bus className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 className="text-subtitle">{dayLabel(t.date)}</h3>
                <p className="text-body-sm text-text-muted tabular-nums">
                  {timeRange(t)} · {routeText(t)}
                </p>
              </div>
              <StatusBadge kind="booking" status="CONFIRMED" />
            </div>
            {t.pickup && (
              <p className="flex items-start gap-2 text-body-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                {t.pickup}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!t.qrAvailable || disabled} onClick={() => onPass(t)}>
                <QrCode className="size-4" aria-hidden />
                Boarding pass
              </Button>
              <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onCancel(t)}>
                Cancel trip
              </Button>
            </div>
            {!t.qrAvailable && (
              <p className="flex items-center gap-1.5 text-caption text-text-muted">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                The school hasn’t opened the boarding pass for this trip yet.
              </p>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function JourneySummary({ journey }: { journey: Schedule | Trip }) {
  return (
    <span className="mt-1 flex flex-col gap-1 rounded-sm bg-surface-muted px-3 py-2 text-text">
      <span className="font-semibold tabular-nums">
        {dayLabel(journey.date)}, {timeRange(journey)}
      </span>
      <span>{routeText(journey)}</span>
      {journey.pickup && <span className="text-text-muted">Pick-up: {journey.pickup}</span>}
    </span>
  );
}

function DialogFailure({ message }: { message: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-2 block text-danger">
      {message}
    </span>
  );
}

function Unsupported() {
  return (
    <Card variant="widget" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
          <Bus className="size-7" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-title">Shuttle bus</h2>
          <p className="text-body-sm text-text-muted">
            Book shuttles between Taicang and SIP and board with a live pass.
          </p>
        </div>
      </div>
      <div role="status" className="flex gap-3 rounded-sm bg-neutral-subtle px-4 py-3 text-neutral">
        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="text-body-sm font-semibold">Available in the Android app</p>
          <p className="text-body-sm text-text">
            Shuttle booking uses your school account through the Campus Helper Android app. It isn’t
            available in a web browser.
          </p>
        </div>
      </div>
    </Card>
  );
}

function CardSkeletons({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}

export function ShuttleSkeleton() {
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
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-11 rounded-sm" />
        <Skeleton className="h-13 rounded-full" />
      </Card>
      <CardSkeletons />
    </div>
  );
}
