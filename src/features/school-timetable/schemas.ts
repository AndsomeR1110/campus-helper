import { z } from "zod";
// Only this term is currently configured. Never assign next-term data to a guessed calendar.
export const SUPPORTED_TERM = "2026/27 S1";
const text = z.string().trim().max(1000);
const activitySchema = z.object({
  identity: z.string().min(1).max(512),
  moduleId: z.string().regex(/^[A-Z]{2,6}\d{3}[A-Z]{0,3}$/),
  name: text.min(1),
  staff: text.nullish(),
  location: text.nullish(),
  scheduledDay: z.string().regex(/^[0-6]$/),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  weekPattern: z.string().min(1).max(300),
});
export const snapshotSchema = z
  .object({ term: z.literal(SUPPORTED_TERM), activities: z.array(activitySchema).min(1).max(200) })
  .strict();
export interface SchoolClass {
  identity: string;
  code: string;
  name: string;
  teacher: string;
  location: string;
  weekday: number;
  startTime: string;
  endTime: string;
  weeks: number[];
}
export function normalizeSnapshot(input: unknown): SchoolClass[] {
  const snapshot = snapshotSchema.parse(input);
  const ids = new Set<string>();
  return snapshot.activities.map((a) => {
    if (ids.has(a.identity)) throw Error("Duplicate school activity");
    ids.add(a.identity);
    const weeks = new Set<number>();
    for (const part of a.weekPattern.split(",")) {
      const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
      if (!match) throw Error("Unsupported teaching weeks");
      const first = Number(match[1]),
        last = Number(match[2] || first);
      if (first < 1 || last > 20 || last < first) throw Error("Unsupported teaching weeks");
      for (let w = first; w <= last; w++) weeks.add(w);
    }
    const start = new Date(a.startTime).getTime() + 8 * 3600000,
      end = new Date(a.endTime).getTime() + 8 * 3600000 - 600000;
    if (end <= start || Math.floor(start / 86400000) !== Math.floor(end / 86400000))
      throw Error("Unsupported class time");
    return {
      identity: a.identity,
      code: a.moduleId,
      name: a.name,
      teacher: a.staff || "",
      location: a.location || "",
      weekday: Number(a.scheduledDay),
      startTime: new Date(start).toISOString().slice(11, 16),
      endTime: new Date(end).toISOString().slice(11, 16),
      weeks: [...weeks].sort((x, y) => x - y),
    };
  });
}
