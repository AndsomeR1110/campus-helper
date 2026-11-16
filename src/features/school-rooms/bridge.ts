"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
const native = registerPlugin<{
  invoke(options: { actorId: string; operation: string; input: unknown }): Promise<unknown>;
}>("SchoolRooms");
export const schoolRoomsAvailable = () =>
  Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SchoolRooms");
const floor = z.object({ id: z.string().regex(/^\d+$/), label: z.string().max(30) });
const rules = z.object({
  minPeople: z.number().int().positive(),
  maxPeople: z.number().int().max(50),
  minMinutes: z.number().int().positive(),
  maxMinutes: z.number().int().max(1440),
  stepMinutes: z.number().int().positive(),
  opensAt: z.string().regex(/^\d\d:\d\d$/),
  closesAt: z.string().regex(/^\d\d:\d\d$/),
  maxDaysAhead: z.number().int().min(0).max(30),
  noShowMinutes: z.number().nullable(),
});
const room = z.object({
  id: z.string(),
  name: z.string().max(100),
  floorId: z.string(),
  capacity: z.number().nullable(),
});
const slot = z.object({
  start: z.string(),
  end: z.string(),
  available: z.boolean(),
  reason: z.enum(["PAST", "BOOKED", "CLOSED"]).optional(),
});
export async function roomInvoke(actorId: string, operation: string, input: unknown = {}) {
  if (!schoolRoomsAvailable()) throw Error("NATIVE_UNAVAILABLE");
  return native.invoke({ actorId, operation, input });
}
export async function resumeRoomsSession(actorId: string) {
  const result = z
    .object({ authenticated: z.literal(true), selfId: z.string().max(64) })
    .parse(await roomInvoke(actorId, "session"));
  return result;
}
export const readRoomFloors = async (actorId: string) =>
  z
    .object({ floors: z.array(floor).max(30), selfId: z.string().max(64) })
    .parse(await roomInvoke(actorId, "floors"));
export const readRoomAvailability = async (actorId: string, date: string, floorId: string) =>
  z
    .object({
      rules: rules.nullable(),
      selfId: z.string(),
      availability: z.array(z.object({ room, slots: z.array(slot).max(1440) })).max(100),
    })
    .parse(await roomInvoke(actorId, "availability", { date, floorId }));
export const readRoomReservations = async (actorId: string) =>
  z
    .object({ reservations: z.array(z.never()).max(0) })
    .parse(await roomInvoke(actorId, "reservations"));
export const prepareRoomBooking = async (actorId: string, input: unknown) =>
  z
    .object({ kind: z.literal("prepared"), message: z.string().max(150) })
    .parse(await roomInvoke(actorId, "prepare", input));
