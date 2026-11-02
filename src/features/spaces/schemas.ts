import { z } from "zod";
export const spaceBookingSchema = z
  .object({
    spaceId: z.string().min(1).max(128),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict();
