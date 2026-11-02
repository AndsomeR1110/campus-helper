import { CalendarDays, House, LayoutGrid, UserRound, type LucideIcon } from "lucide-react";
import type { TagType } from "@/components/ui";

export type TabId = "home" | "services" | "schedule" | "profile";

export interface Tab {
  id: TabId;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** The four primary destinations (PRD §4.1). */
export const TABS: readonly Tab[] = [
  { id: "home", label: "Home", href: "/home", icon: House },
  { id: "services", label: "Services", href: "/services", icon: LayoutGrid },
  { id: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
  { id: "profile", label: "Profile", href: "/profile", icon: UserRound },
];

/** Which tab each route belongs to (ui-ux-spec §3.3). First match wins. */
const TAB_PREFIXES: ReadonlyArray<[prefix: string, tab: TabId]> = [
  ["/home", "home"],
  ["/notifications", "home"],
  ["/services", "services"],
  ["/office-hours", "services"],
  ["/spaces", "services"],
  ["/lost-found", "services"],
  ["/schedule", "schedule"],
  ["/courses", "schedule"],
  ["/profile", "profile"],
  ["/bookings", "profile"],
  ["/my", "profile"],
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getActiveTab(pathname: string): TabId | null {
  for (const [prefix, tab] of TAB_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return tab;
  }
  return null;
}

/**
 * Level-3 pages (details and forms) hide the bottom navigation and use a
 * StickyActionBar for their primary action instead (ui-ux-spec §3.3).
 * Add a pattern here when you create a new detail or form route.
 */
const FOCUSED_ROUTES: readonly RegExp[] = [
  /^\/office-hours\/[^/]+$/, // PG-05 Teacher Detail
  /^\/spaces\/[^/]+$/, // PG-09 Space Detail
  /^\/bookings\/[^/]+$/, // PG-10 Booking Detail
  /^\/courses\/new$/, // PG-12 Course Editor
  /^\/courses\/[^/]+\/edit$/, // PG-12 Course Editor
  /^\/lost-found\/[^/]+$/, // PG-15 Create Post, PG-16 Post Detail
];

export function shouldShowBottomNav(pathname: string) {
  return !FOCUSED_ROUTES.some((pattern) => pattern.test(pathname));
}

export interface ServiceEntry {
  label: string;
  description: string;
  href: string;
  /** Drives icon and colour via TypeTag helpers. */
  type: TagType;
}

/** The four services, shared by Home quick access and the Services page. */
export const SERVICES: readonly ServiceEntry[] = [
  {
    label: "Office Hour",
    description: "Book time with teaching staff",
    href: "/office-hours",
    type: "office",
  },
  {
    label: "Study Space",
    description: "Reserve a seat to study",
    href: "/spaces",
    type: "space",
  },
  {
    label: "Class Reminder",
    description: "Your timetable and reminders",
    href: "/schedule",
    type: "class",
  },
  {
    label: "Lost & Found",
    description: "Report or find lost items",
    href: "/lost-found",
    type: "lost",
  },
];
