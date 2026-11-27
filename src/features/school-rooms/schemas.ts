import { z } from "zod";
export const roomBookingSchema = z
  .object({
    floorId: z.string().regex(/^\d{1,10}$/),
    roomId: z.string().regex(/^\d{1,10}$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    minutes: z.number().int().min(1).max(1440),
    memberIds: z
      .array(z.string().regex(/^[A-Za-z0-9._-]{3,64}$/))
      .min(1)
      .max(4),
  })
  .strict();
export const roomReservationSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    roomName: z.string().max(100),
    floorLabel: z.string().max(30),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d\d:\d\d$/),
    end: z.string().regex(/^\d\d:\d\d$/),
    members: z.array(z.string().max(80)).max(5),
    status: z.enum(["AWAITING", "CONFIRMED", "CANCELLED"]),
    cancellable: z.boolean(),
  })
  .strict();
export const roomWriteResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("confirmed"), reservation: roomReservationSchema }).strict(),
  z.object({ kind: z.literal("awaiting"), reservation: roomReservationSchema }).strict(),
  z.object({ kind: z.literal("rejected"), message: z.string().max(300) }).strict(),
  z.object({ kind: z.literal("unknown") }).strict(),
]);
