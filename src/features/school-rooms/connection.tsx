"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Card, ErrorState, Spinner, useOffline } from "@/components/ui";
import { SchoolAccountSignIn, restoreSchoolConnection } from "@/features/school-auth";
import { RoomsView, type RoomsStatus } from "./components/rooms-view";
import {
  prepareRoomBooking,
  readRoomAvailability,
  readRoomFloors,
  readRoomReservations,
  schoolRoomsAvailable,
} from "./bridge";
import type {
  BookingDraft,
  BookingOutcome,
  Floor,
  Reservation,
  RoomAvailability,
  RoomRules,
} from "./types";
const subscribe = () => () => {};
const codeOf = (e: unknown) =>
  e && typeof e === "object" && "code" in e ? String(e.code) : e instanceof Error ? e.message : "";
export function SchoolRoomsConnection({ actorId, today }: { actorId: string; today: string }) {
  const available = useSyncExternalStore(subscribe, schoolRoomsAvailable, () => false);
  const offline = useOffline();
  const [status, setStatus] = useState<RoomsStatus>("loading"),
    [signIn, setSignIn] = useState(false);
  const [floors, setFloors] = useState<Floor[]>([]),
    [floorId, setFloorId] = useState(""),
    [date, setDate] = useState(today);
  const [rules, setRules] = useState<RoomRules | null>(null),
    [rooms, setRooms] = useState<RoomAvailability[] | null>(null);
  const [reservations, setReservations] = useState<Reservation[] | null>(null),
    [selfId, setSelfId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState("");
  const live = useRef(false),
    running = useRef(false);
  function fail(e: unknown) {
    const code = codeOf(e);
    setStatus(
      code === "AUTH_REQUIRED" || code === "ACCOUNT_SWITCH_REQUIRED"
        ? "signed-out"
        : code === "GATEWAY_BLOCKED"
          ? "gateway-blocked"
          : "error",
    );
  }
  async function load(
    selectedFloor = floorId,
    selectedDate = date,
    restore = false,
    signal?: AbortSignal,
  ) {
    if (running.current || offline || !available) return;
    running.current = true;
    setStatus("loading");
    try {
      if (restore) await restoreSchoolConnection(actorId, "rooms", () => live.current, signal);
      if (!live.current) return;
      const menu = await readRoomFloors(actorId);
      if (!live.current) return;
      const id = menu.floors.some((f) => f.id === selectedFloor)
        ? selectedFloor
        : menu.floors[0]?.id;
      if (!id) throw Error("INVALID_SCHOOL_DATA");
      const data = await readRoomAvailability(actorId, selectedDate, id);
      if (!live.current) return;
      setFloors(menu.floors);
      setFloorId(id);
      setDate(selectedDate);
      setRules(data.rules);
      setRooms(data.availability);
      setSelfId(data.selfId);
      setStatus("ready");
      try {
        const saved = await readRoomReservations(actorId);
        if (live.current) {
          setReservations(saved.reservations);
          setBookingError("");
        }
      } catch {
        if (live.current)
          setBookingError(
            "We couldn’t verify your school reservation records. No status has been assumed.",
          );
      }
    } catch (e) {
      if (live.current) fail(e);
    } finally {
      running.current = false;
    }
  }
  useEffect(() => {
    let current = true;
    live.current = true;
    const abort = new AbortController();
    queueMicrotask(() => {
      if (!current || !live.current) return;
      if (!available) {
        setStatus("not-connected");
        return;
      }
      if (!navigator.onLine) {
        setStatus("error");
        return;
      }
      void load("", today, true, abort.signal);
    });
    return () => {
      current = false;
      live.current = false;
      abort.abort();
    };
    // The route is keyed by its server-side actor. Later retries are user initiated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, available]);
  async function prepare(draft: BookingDraft): Promise<BookingOutcome> {
    if (running.current || offline)
      return { kind: "rejected", message: "Wait for the school query to finish." };
    running.current = true;
    try {
      return await prepareRoomBooking(actorId, { ...draft, floorId });
    } catch (e) {
      const code = codeOf(e);
      if (code === "AUTH_REQUIRED") return { kind: "auth" };
      return {
        kind: code === "CONFLICT" ? "conflict" : "rejected",
        message:
          code === "INVALID_GROUP"
            ? "The school could not verify this group. Check the campus accounts and group size."
            : "The booking details could not be verified. Refresh rooms and try again. Nothing was submitted.",
      };
    } finally {
      running.current = false;
    }
  }
  return (
    <>
      {signIn && (
        <p role="status" className="flex items-center gap-2 text-body-sm text-text-muted">
          <Spinner className="size-4" />
          Checking university connection…
        </p>
      )}
      {signIn && (
        <SchoolAccountSignIn
          actorId={actorId}
          service="rooms"
          onClose={() => setSignIn(false)}
          onConnected={() => void load()}
        />
      )}
      {available && (
        <Card>
          <p className="text-body-sm text-text-muted">
            Booking review only. Check live availability and booking details; no reservation or
            cancellation will be submitted.
          </p>
        </Card>
      )}
      <RoomsView
        verificationOnly
        status={status}
        rules={rules}
        floors={floors}
        today={today}
        floorId={floorId}
        date={date}
        availability={rooms}
        reservations={reservations}
        selfId={selfId}
        onFloorChange={(id) => void load(id)}
        onDateChange={(value) => void load(floorId, value)}
        onRetry={() => void load(floorId, date, true)}
        onSignIn={() => setSignIn(true)}
        onSubmit={prepare}
        onCancel={async () => "rejected"}
        onRefreshReservations={() => void load()}
      />
      {bookingError && <ErrorState description={bookingError} onRetry={() => void load()} />}
    </>
  );
}
