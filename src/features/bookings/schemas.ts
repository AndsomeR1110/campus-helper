import { z } from "zod";
export const bookingIdSchema = z
  .string()
  .max(160)
  .regex(/^(office|space)-[A-Za-z0-9_-]+$/);
