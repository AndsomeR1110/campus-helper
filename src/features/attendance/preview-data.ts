/**
 * DEVELOPMENT PREVIEW ONLY — fictional classes and codes. Imported only by
 * the /services/attendance/preview route; never a fallback for real AMS data.
 */
import type { AttendanceClass } from "./types";

/** The fictional code that the preview accepts. */
export const PREVIEW_CODE = "4821";

const at = (today: string, hhmm: string) => new Date(`${today}T${hhmm}:00+08:00`).toISOString();

export function previewClasses(today: string): AttendanceClass[] {
  return [
    {
      id: "p-1",
      moduleCode: "CPT203",
      name: "Fictional Software Studio",
      startsAt: at(today, "09:00"),
      endsAt: at(today, "10:50"),
      location: "Building D D-201",
      window: "CLOSED",
      record: "PRESENT",
      recordedAt: at(today, "09:04"),
    },
    {
      id: "p-2",
      moduleCode: "CPT206",
      name: "Fictional Networks Lecture",
      startsAt: at(today, "14:00"),
      endsAt: at(today, "15:50"),
      location: "Office C-308",
      window: "OPEN",
      record: "NONE",
      recordedAt: null,
    },
    {
      id: "p-3",
      moduleCode: "EAP121",
      name: "Fictional Academic English",
      startsAt: at(today, "16:00"),
      endsAt: at(today, "17:50"),
      location: "Building A A-105",
      window: "NOT_OPEN",
      record: "NONE",
      recordedAt: null,
    },
  ];
}
