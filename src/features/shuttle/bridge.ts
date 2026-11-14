"use client";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import {
  passSchema,
  bookingResultSchema,
  cancellationResultSchema,
  querySchema,
  schedulesSchema,
  tripsSchema,
  type Schedule,
  type Trip,
} from "./schemas";

interface ShuttleNative {
  login(): Promise<void>;
  closePass(): Promise<void>;
  invoke(options: { operation: string; input: Record<string, unknown> }): Promise<unknown>;
  addListener(
    name: "stateChanged",
    listener: (data: { active: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}
const native = registerPlugin<ShuttleNative>("Shuttle");
export const shuttleAvailable = () =>
  Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("Shuttle");
async function invoke(operation: string, input: Record<string, unknown> = {}) {
  if (!shuttleAvailable()) throw new Error("NATIVE_UNAVAILABLE");
  return native.invoke({ operation, input });
}
export const shuttle = {
  login: () => native.login(),
  schedules: async (date: string, route: 1 | 2) =>
    schedulesSchema.parse(await invoke("schedules", querySchema.parse({ date, route }))).schedules,
  trips: async () => tripsSchema.parse(await invoke("trips")).trips,
  book: async (schedule: Schedule) =>
    bookingResultSchema.parse(
      await invoke("book", {
        id: schedule.id,
        date: schedule.date,
        route: schedule.route,
        confirmed: true,
      }),
    ),
  cancel: async (trip: Trip) =>
    cancellationResultSchema.parse(await invoke("cancel", { id: trip.id, confirmed: true })),
  pass: async (trip: Trip) => passSchema.parse(await invoke("pass", { id: trip.id })),
  scan: (trip: Trip) => invoke("scan", { id: trip.id }),
  closePass: () => native.closePass().catch(() => {}),
  onState: (listener: (data: { active: boolean }) => void) =>
    native.addListener("stateChanged", listener),
};

export function shuttleError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : error instanceof Error
        ? error.message
        : "";
  switch (code) {
    case "AUTH_REQUIRED":
      return "Sign in to your university account, then try again.";
    case "RESULT_UNKNOWN":
      return "The school has not confirmed the result. Refresh My trips before trying again.";
    case "ALREADY_BOOKED":
      return "You already have this trip. Refresh My trips.";
    case "NOT_FOUND":
      return "This booking is no longer available. Refresh My trips.";
    case "PASS_UNAVAILABLE":
      return "The school has not opened a boarding pass for this trip.";
    case "UPDATE_WEBVIEW":
      return "Update Android System WebView to connect your school account.";
    case "BUSY":
      return "Another school request is in progress. Please try again shortly.";
    default:
      return "The school service could not complete this request. Check your connection and try again.";
  }
}
