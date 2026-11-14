"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { snapshotSchema, normalizeSnapshot } from "./schemas";
const native = registerPlugin<{
  connect(options: { actorId: string; silent?: boolean }): Promise<unknown>;
  forgetConnection(options: { actorId: string }): Promise<void>;
}>("SchoolTimetable");
export const schoolTimetableAvailable = () =>
  Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SchoolTimetable");
export interface SyncState {
  version: number;
  syncedAt: string | null;
  term: string | null;
  count: number;
}
async function responseData(r: Response) {
  const result = await r.json();
  if (!r.ok) throw Error(result.error?.message || "School timetable could not be saved.");
  return result.data;
}
export const readSyncState = async (): Promise<SyncState> =>
  responseData(await fetch("/api/courses/school-sync", { cache: "no-store" }));
export async function syncSchoolTimetable(
  expectedActor: string,
  stillActive: () => boolean = () => true,
  silent = false,
): Promise<SyncState> {
  if (!schoolTimetableAvailable())
    throw Error("Automatic school connection requires the Android app.");
  const before = await readSyncState();
  const snapshot = snapshotSchema.parse(await native.connect({ actorId: expectedActor, silent }));
  normalizeSnapshot(snapshot);
  if (!stillActive()) throw Error("Timetable connection cancelled.");
  return responseData(
    await fetch("/api/courses/school-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot, expectedVersion: before.version, expectedActor }),
    }),
  );
}
export function connectionError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "CANCELLED") return "Connection cancelled. Your saved timetable is unchanged.";
  if (code === "UNSUPPORTED_TERM")
    return "This school term is not configured yet. Your saved timetable is unchanged.";
  if (code === "TIMED_OUT") return "School connection timed out. Please reconnect.";
  if (code === "UPDATE_WEBVIEW") return "Update Android System WebView before connecting.";
  if (
    code === "NATIVE_UNAVAILABLE" ||
    (error instanceof Error && error.message === "NATIVE_UNAVAILABLE")
  )
    return "Update and open the Android app to restore your school connection. Saved courses are kept.";
  return error instanceof Error &&
    !code &&
    !error.message.includes("[") &&
    !/^[A-Z_]+$/.test(error.message)
    ? error.message
    : "Could not read the school timetable. Check your connection and reconnect. Your saved timetable is unchanged.";
}

export const forgetSchoolConnection = (actorId: string) => native.forgetConnection({ actorId });
