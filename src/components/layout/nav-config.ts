import {
  CalendarDays,
  House,
  LayoutGrid,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
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
  // Role tools are reached from Profile on phones.
  ["/teacher", "profile"],
  ["/admin", "profile"],
];

/** Teacher / admin tools. On desktop they are highlighted under "Role tools" instead of a tab. */
export function isRoleToolRoute(pathname: string) {
  return ["/teacher", "/admin"].some((prefix) => matchesPrefix(pathname, prefix));
}

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
  /^\/courses\/sync$/, // School account connection
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
  /** One-word label for the phone quick-access grid when `label` would wrap. */
  shortLabel?: string;
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
    shortLabel: "Classes",
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

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface RoleTool {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Role-only entry points (PRD §4.1: teacher and admin tools stay out of the
 * student tab bar). Hiding a link is not authorization — those pages and their
 * APIs must still check the role on the server (AUTH-AC-04).
 */
export function roleToolsFor(role: UserRole | null | undefined): RoleTool[] {
  const tools: RoleTool[] = [];
  if (role === "TEACHER" || role === "ADMIN") {
    tools.push({ label: "Teacher dashboard", href: "/teacher/office-hours", icon: UserRoundCog });
  }
  if (role === "ADMIN") {
    tools.push({ label: "Admin dashboard", href: "/admin", icon: ShieldCheck });
  }
  return tools;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  ADMIN: "Administrator",
};
