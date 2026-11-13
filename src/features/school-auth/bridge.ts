"use client";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { z } from "zod";
import { syncSchoolTimetable, type SyncState } from "@/features/school-timetable";
import { resumeShuttleSession } from "@/features/shuttle";

const stateSchema = z
  .object({
    operationId: z.string().uuid(),
    actorId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    service: z.enum(["timetable", "shuttle"]),
    status: z.enum([
      "credentialsRequired",
      "imageRequired",
      "interactiveRequired",
      "authenticated",
    ]),
    errorCode: z
      .string()
      .regex(/^(SSO\d{5}|AUTH_REJECTED)$/)
      .optional(),
    image: z
      .string()
      .max(100000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
      .optional(),
  })
  .strict()
  .refine(
    (state) => state.status !== "imageRequired" || !!state.image,
    "Verification image missing.",
  );
export type SchoolAuthState = z.infer<typeof stateSchema>;
export type SchoolService = SchoolAuthState["service"];
export type SchoolAuthOperation = Pick<SchoolAuthState, "operationId" | "actorId">;
export type SchoolAuthEnd = SchoolAuthOperation & { code: string };
type Operation = SchoolAuthOperation;
const native = registerPlugin<{
  begin(options: Operation & { service: SchoolService }): Promise<unknown>;
  submitCredentials(options: Operation & { username: string; password: string }): Promise<unknown>;
  submitImageCode(options: Operation & { answer: string }): Promise<unknown>;
  refreshImage(options: Operation): Promise<unknown>;
  showChallenge(options: Operation): Promise<unknown>;
  cancel(options: Operation): Promise<void>;
  disconnect(options: { actorId: string; confirmed: true }): Promise<void>;
  addListener(
    name: "stateChanged",
    listener: (state: { active: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    name: "operationEnded",
    listener: (state: SchoolAuthEnd) => void,
  ): Promise<PluginListenerHandle>;
}>("SchoolAuth");
export function onSchoolAuthEnd(listener: (state: SchoolAuthEnd) => void) {
  check();
  return native.addListener("operationEnded", listener);
}
export function onSchoolAuthActivity(listener: (state: { active: boolean }) => void) {
  check();
  return native.addListener("stateChanged", listener);
}
export const schoolAuthAvailable = () =>
  Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SchoolAuth");
export function schoolAuthError(error: unknown) {
  const code =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "code" in error
        ? String(error.code)
        : error instanceof Error
          ? error.message
          : "";
  switch (code) {
    case "CANCELLED":
      return "University sign-in cancelled. Your saved data is unchanged.";
    case "TIMED_OUT":
      return "University sign-in timed out. Start again.";
    case "NATIVE_UNAVAILABLE":
      return "Connect your university account in the Android app.";
    case "BUSY":
      return "Another university request is in progress. Please wait.";
    case "RATE_LIMITED":
      return "Please wait a moment before submitting again.";
    case "KEY_UNAVAILABLE":
      return "University sign-in could not be prepared securely. Start again.";
    case "STALE_OPERATION":
      return "This sign-in has expired or the app account changed. Start again.";
    case "ACCOUNT_SWITCH_REQUIRED":
      return "Disconnect the previous university session before connecting this app account.";
    case "CHALLENGE_EXPIRED":
      return "University verification has expired. Start again.";
    case "SSO10121":
      return "The university requires account activation before sign-in.";
    default:
      return "University sign-in could not be completed. Check your details and connection, then try again.";
  }
}
const operation = (state: Operation): Operation => ({
  operationId: state.operationId,
  actorId: state.actorId,
});
function check() {
  if (!schoolAuthAvailable()) throw Error("NATIVE_UNAVAILABLE");
}
async function reply(result: Promise<unknown>, expected: Operation & { service?: SchoolService }) {
  const state = stateSchema.parse(await result);
  if (
    state.actorId !== expected.actorId ||
    ("operationId" in expected && state.operationId !== expected.operationId) ||
    (expected.service && state.service !== expected.service)
  )
    throw Error("STALE_OPERATION");
  if (state.status === "imageRequired" && !state.image) throw Error("INVALID_SCHOOL_DATA");
  return state;
}
export async function beginSchoolAuth(
  actorId: string,
  service: SchoolService,
  operationId?: string,
) {
  check();
  operationId ??= crypto.randomUUID();
  const state = stateSchema.parse(await native.begin({ actorId, service, operationId }));
  if (state.actorId !== actorId || state.service !== service || state.operationId !== operationId)
    throw Error("STALE_OPERATION");
  return state;
}
export function submitSchoolCredentials(
  state: SchoolAuthState,
  username: string,
  password: string,
) {
  check();
  if (
    state.status !== "credentialsRequired" ||
    !username ||
    username.length > 64 ||
    !password ||
    password.length > 100
  )
    throw Error("INVALID_INPUT");
  return reply(native.submitCredentials({ ...operation(state), username, password }), state);
}
export function submitSchoolImageCode(state: SchoolAuthState, answer: string) {
  check();
  if (state.status !== "imageRequired" || !/^[A-Za-z0-9]{4}$/.test(answer))
    throw Error("INVALID_INPUT");
  return reply(native.submitImageCode({ ...operation(state), answer }), state);
}
export function refreshSchoolImage(state: SchoolAuthState) {
  check();
  return reply(native.refreshImage(operation(state)), state);
}
export function showSchoolChallenge(state: SchoolAuthState) {
  check();
  return reply(native.showChallenge(operation(state)), state);
}
export async function cancelSchoolAuth(state: Operation) {
  check();
  await native.cancel(operation(state));
}
export async function disconnectSchoolAccount(actorId: string, confirmed: true) {
  check();
  if (confirmed !== true) throw Error("CONFIRMATION_REQUIRED");
  await native.disconnect({ actorId, confirmed });
}
export async function completeSchoolConnection(
  state: SchoolAuthState,
  stillActive: () => boolean = () => true,
): Promise<{ service: SchoolService; synced?: SyncState }> {
  state = stateSchema.parse(state);
  if (state.status !== "authenticated" || !stillActive()) throw Error("STALE_OPERATION");
  if (state.service === "timetable") {
    const synced = await syncSchoolTimetable(state.actorId, stillActive, true);
    if (!stillActive()) throw Error("STALE_OPERATION");
    return { service: "timetable", synced };
  }
  await resumeShuttleSession();
  if (!stillActive()) throw Error("STALE_OPERATION");
  return { service: "shuttle" };
}
