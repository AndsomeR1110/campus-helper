import { z } from "zod";

const id = z.string().regex(/^\d{1,12}$/);
const date = z.iso.date();
const time = z.string().regex(/^\d{2}:\d{2}$/);
const journey = {
  id,
  date,
  departure: time,
  arrival: time,
  from: z.enum(["TC Campus", "SIP Campus"]),
  to: z.enum(["TC Campus", "SIP Campus"]),
  pickup: z.string().max(300),
};
export const scheduleSchema = z.object({
  ...journey,
  route: z.union([z.literal(1), z.literal(2)]),
});
export const tripSchema = z.object({ ...journey, qrAvailable: z.boolean() });
export const schedulesSchema = z.object({ schedules: z.array(scheduleSchema).max(200) });
export const tripsSchema = z.object({ trips: z.array(tripSchema).max(200) });
export const bookingResultSchema = z.object({ confirmed: z.literal(true), trip: tripSchema });
export const cancellationResultSchema = z.object({ cancelled: z.literal(true) });
export const passSchema = z.object({
  payload: z.string().min(1).max(2048),
  validForMs: z.number().min(0).max(10000),
});
export const querySchema = z.object({ date, route: z.union([z.literal(1), z.literal(2)]) });
export type Schedule = z.infer<typeof scheduleSchema>;
export type Trip = z.infer<typeof tripSchema>;
