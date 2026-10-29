/**
 * Unified schedule contract (docs/frontend-architecture.md §7.1).
 *
 * This is the interface Member 4 provides to Member 2 (office hour bookings)
 * and Member 3 (study space bookings). Providers convert their own records into
 * `ScheduleEvent`; the PG-11 schedule page only ever sees this shape.
 */

export type ScheduleEventType = "CLASS" | "OFFICE_HOUR" | "STUDY_SPACE";

/**
 * What a provider hands over. The `id` is derived by `createScheduleEvent()`
 * so providers never have to compose it themselves.
 */
export interface ScheduleEventSource {
  type: ScheduleEventType;
  /** Primary key of the provider's own record. */
  sourceId: string;
  title: string;
  /** ISO 8601 in UTC. */
  startsAt: string;
  /** ISO 8601 in UTC. */
  endsAt: string;
  location: string | null;
  /** The provider's own business status, rendered through <StatusBadge>. */
  status: string;
  /** Detail page path, e.g. "/bookings/office-abc123". */
  href: string;
}

export interface ScheduleEvent extends ScheduleEventSource {
  /** `${type}:${sourceId}` — stable and unique across providers. */
  id: string;
}

/** One calendar day of the schedule, keyed by the Asia/Shanghai date. */
export interface ScheduleDay {
  /** "YYYY-MM-DD" in Asia/Shanghai. */
  date: string;
  events: ScheduleEvent[];
}
