import type { BookingStatus } from "@/features/spaces";

/** Local view model; does not define or replace Member 4's ScheduleEvent. */
export interface BookingItem {
  id: string;
  sourceId: string;
  type: "OFFICE_HOUR" | "STUDY_SPACE";
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  status: BookingStatus;
  href: string;
}
