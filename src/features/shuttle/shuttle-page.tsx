"use client";
import { useState, useSyncExternalStore } from "react";
import { Bus, ArrowRight } from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  DatePicker,
  Select,
  Skeleton,
  StatusBadge,
  toast,
  useOffline,
} from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { SchoolAccountSignIn, schoolAuthAvailable } from "@/features/school-auth";
import { BoardingPass } from "./boarding-pass";
import { shuttle, shuttleAvailable, shuttleError } from "./bridge";
import type { Schedule, Trip } from "./schemas";

const range = (trip: Schedule | Trip) =>
  formatTimeRange(
    `${trip.date}T${trip.departure}:00+08:00`,
    `${trip.date}T${trip.arrival}:00+08:00`,
  );
const subscribe = () => () => {};
export function ShuttlePage({ initialDate, actorId }: { initialDate: string; actorId: string }) {
  const offline = useOffline();
  const available = useSyncExternalStore(
    subscribe,
    () => shuttleAvailable() && schoolAuthAvailable(),
    () => null,
  );
  const [date, setDate] = useState(initialDate);
  const [route, setRoute] = useState<1 | 2>(2);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<Schedule | null>(null);
  const [cancelling, setCancelling] = useState<Trip | null>(null);
  const [pass, setPass] = useState<Trip | null>(null);
  const [connected, setConnected] = useState(false);
  const [signIn, setSignIn] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(shuttleError(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function refreshTrips() {
    setTrips(await shuttle.trips());
  }
  async function search() {
    await run(async () => {
      setSchedules(await shuttle.schedules(date, route));
      await refreshTrips();
    }).catch(() => {});
  }
  if (available === null) return <Skeleton className="h-48" />;
  if (!available)
    return (
      <EmptyState
        icon={Bus}
        title="Shuttle is available in the Android app"
        description="Install Campus Helper for Android to connect your school account and book without leaving the app."
      />
    );
  return (
    <div className="flex flex-col gap-5 pb-6">
      {signIn && (
        <SchoolAccountSignIn
          actorId={actorId}
          service="shuttle"
          onClose={() => setSignIn(false)}
          onConnected={() => {
            setConnected(true);
            void run(refreshTrips).catch(() => {});
          }}
        />
      )}
      <Card variant="widget" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Bus className="size-7 text-primary" />
          <div>
            <h2 className="text-subtitle">Between campuses</h2>
            <p className="text-body-sm text-text-muted">
              Plan your trip, book and board in one place.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          disabled={busy || offline || !!pass}
          onClick={() => setSignIn(true)}
        >
          {connected ? "Reconnect school account" : "Connect school account"}
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Direction">
            <Select
              disabled={busy}
              value={route}
              onChange={(e) => {
                setRoute(Number(e.target.value) as 1 | 2);
                setSchedules(null);
              }}
            >
              <option value={2}>Taicang → SIP</option>
              <option value={1}>SIP → Taicang</option>
            </Select>
          </FormField>
          <FormField label="Departure date">
            <DatePicker
              disabled={busy}
              min="today"
              value={date}
              onChange={(value) => {
                setDate(value);
                setSchedules(null);
              }}
            />
          </FormField>
        </div>
        <Button
          disabled={offline || busy || !connected || !date || !!pass}
          loading={busy}
          onClick={() => void search()}
        >
          Find departures
        </Button>
        <p className="text-caption text-text-muted">
          Book before 16:00 the previous day where possible. School availability and cancellation
          rules apply.
        </p>
        {offline && <p className="text-body-sm text-text-muted">Unavailable offline</p>}
      </Card>
      {error && <ErrorState description={error} onRetry={() => void search()} />}
      {busy && <Skeleton className="h-24" />}
      {schedules && (
        <section className="flex flex-col gap-3" aria-label="Departures">
          <h2 className="text-subtitle">Departures</h2>
          {schedules.length === 0 && (
            <EmptyState
              title="No available departures"
              description="Try another date or direction."
            />
          )}
          {schedules.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title tabular-nums">{range(s)}</h3>
                <Button disabled={offline || busy} onClick={() => setBooking(s)}>
                  Book trip
                </Button>
              </div>
              <p className="flex items-center gap-2 text-body-sm">
                {s.from}
                <ArrowRight className="size-4" />
                {s.to}
              </p>
              <p className="text-caption text-text-muted">
                Pick-up: {s.pickup || "Shown by the school before booking"}
              </p>
            </Card>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-3" aria-label="My trips">
        <div className="flex items-center justify-between">
          <h2 className="text-subtitle">My trips</h2>
          <Button
            variant="ghost"
            disabled={offline || busy || !connected || !!pass}
            onClick={() => void run(refreshTrips).catch(() => {})}
          >
            Refresh trips
          </Button>
        </div>
        {trips?.length === 0 && (
          <EmptyState
            title="No upcoming trips"
            description="Your school bookings will appear here."
          />
        )}
        {trips === null && (
          <p className="text-body-sm text-text-muted">
            Connect your school account or refresh to load your bookings.
          </p>
        )}
        {trips?.map((t) => (
          <Card key={t.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-subtitle">
                {formatDate(`${t.date}T12:00:00+08:00`)} · {range(t)}
              </h3>
              <StatusBadge kind="booking" status="CONFIRMED" />
            </div>
            <p className="text-body-sm">
              {t.from} → {t.to}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!t.qrAvailable || offline || busy} onClick={() => setPass(t)}>
                Boarding pass
              </Button>
              <Button
                variant="secondary"
                disabled={offline || busy}
                onClick={() => setCancelling(t)}
              >
                Cancel trip
              </Button>
            </div>
            {!t.qrAvailable && (
              <p className="text-caption text-text-muted">
                The school has not opened this boarding pass yet.
              </p>
            )}
          </Card>
        ))}
      </section>
      <ConfirmDialog
        open={!!booking}
        onClose={() => setBooking(null)}
        tone="primary"
        title="Book this shuttle?"
        description={
          booking &&
          `${formatDate(`${booking.date}T12:00:00+08:00`)} · ${range(booking)} · ${booking.from} → ${booking.to}. Confirm only if you intend to travel.`
        }
        confirmLabel="Confirm booking"
        onConfirm={async () => {
          if (!booking || offline) return;
          await run(async () => {
            await shuttle.book(booking);
            setBooking(null);
            await refreshTrips();
            toast.success("Shuttle booked");
          });
        }}
      />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this shuttle?"
        description="Your school booking will be cancelled. You will need to book again to take this trip."
        confirmLabel="Cancel trip"
        cancelLabel="Keep trip"
        onConfirm={async () => {
          if (!cancelling || offline) return;
          await run(async () => {
            await shuttle.cancel(cancelling);
            setCancelling(null);
            await refreshTrips();
            toast.success("Shuttle cancelled");
          });
        }}
      />
      {pass && <BoardingPass trip={pass} onClose={() => setPass(null)} />}
    </div>
  );
}
