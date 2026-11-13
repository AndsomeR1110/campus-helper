"use client";
/**
 * DEVELOPMENT PREVIEW of the discussion room flow with fictional data and a
 * state switcher for review. Lives on its own route; the real route never
 * imports this file or the fixtures.
 */
import { useEffect, useState } from "react";
import { Card, Chip, ChipGroup } from "@/components/ui";
import {
  PREVIEW_FLOORS,
  PREVIEW_RESERVATIONS,
  PREVIEW_RULES,
  PREVIEW_SELF_ID,
  previewAvailability,
} from "../preview-data";
import { fromMinutes, toMinutes } from "../rules";
import type { BookingDraft, BookingOutcome, Reservation, RoomAvailability } from "../types";
import { PreviewBanner } from "./preview-banner";
import { RoomsView, type RoomsStatus } from "./rooms-view";

const SCREENS: { id: RoomsStatus | "empty"; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "No rooms" },
  { id: "not-connected", label: "Not connected" },
  { id: "signed-out", label: "Signed out" },
  { id: "gateway-blocked", label: "School blocked" },
  { id: "error", label: "Error" },
];
const RESULTS: { id: BookingOutcome["kind"]; label: string }[] = [
  { id: "confirmed", label: "Confirmed" },
  { id: "awaiting", label: "Awaiting school" },
  { id: "conflict", label: "Conflict" },
  { id: "rejected", label: "Rule rejected" },
  { id: "unknown", label: "Result unknown" },
  { id: "auth", label: "Session expired" },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function RoomsPreview({ today }: { today: string }) {
  const [screen, setScreen] = useState<RoomsStatus | "empty">("ready");
  const [result, setResult] = useState<BookingOutcome["kind"]>("confirmed");
  const [offline, setOffline] = useState(false);
  const [floorId, setFloorId] = useState(PREVIEW_FLOORS[0].id);
  const [date, setDate] = useState(today);
  const [loaded, setLoaded] = useState<{ key: string; data: RoomAvailability[] } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    PREVIEW_RESERVATIONS(today),
  );
  const key = `${floorId}|${date}|${screen}`;
  // Shows the loading state whenever floor or date change, like a live query.
  const availability = loaded?.key === key ? loaded.data : null;

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setLoaded({
          key,
          data: screen === "empty" ? [] : previewAvailability(floorId, daysBetween(today, date)),
        }),
      450,
    );
    return () => clearTimeout(timer);
  }, [key, floorId, date, screen, today]);

  async function submit(draft: BookingDraft): Promise<BookingOutcome> {
    await wait(900);
    const room = availability?.find((a) => a.room.id === draft.roomId)?.room;
    const reservation: Reservation = {
      id: `p-${Date.now()}`,
      roomName: room?.name ?? draft.roomId,
      floorLabel: floorId,
      date: draft.date,
      start: draft.start,
      end: fromMinutes(toMinutes(draft.start) + draft.minutes),
      members: ["You", ...draft.memberIds.map((id) => `Member ···${id.slice(-3)}`)],
      status: result === "confirmed" ? "CONFIRMED" : "AWAITING",
      cancellable: true,
    };
    switch (result) {
      case "confirmed":
      case "awaiting":
        setReservations((list) => [...list, reservation]);
        return { kind: result, reservation };
      case "conflict":
        return { kind: "conflict", message: "Someone booked this room for part of that time." };
      case "rejected":
        return {
          kind: "rejected",
          message: "The school rejected this booking: a member already has a room at that time.",
        };
      default:
        return { kind: result };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PreviewBanner service="Discussion room booking" />
      <Card className="flex flex-col gap-3">
        <h2 className="text-caption tracking-wide text-text-muted uppercase">Preview controls</h2>
        <Control label="Screen">
          {SCREENS.map((s) => (
            <Chip key={s.id} selected={screen === s.id} onClick={() => setScreen(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Control>
        <Control label="Next booking result">
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
      </Card>
      <RoomsView
        status={screen === "empty" ? "ready" : screen}
        errorMessage="The room system didn’t respond. Check your connection and try again."
        rules={PREVIEW_RULES}
        floors={PREVIEW_FLOORS}
        today={today}
        floorId={floorId}
        date={date}
        availability={availability}
        reservations={reservations}
        selfId={PREVIEW_SELF_ID}
        offlineOverride={offline}
        onFloorChange={setFloorId}
        onDateChange={setDate}
        onRetry={() => setScreen("ready")}
        onSignIn={() => setScreen("ready")}
        onSubmit={submit}
        onRefreshReservations={() => {}}
        onCancel={async (r) => {
          await wait(700);
          setReservations((list) =>
            list.map((x) =>
              x.id === r.id ? { ...x, status: "CANCELLED", cancellable: false } : x,
            ),
          );
          return "cancelled";
        }}
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
