import type { Weekday, WeekParity } from "./types";

/** All times are stored in UTC and interpreted in this zone (CONTRIBUTING §7). */
export const TIME_ZONE = "Asia/Shanghai";

/** Asia/Shanghai has no daylight saving time, so a fixed offset is correct. */
export const SHANGHAI_UTC_OFFSET_MINUTES = 8 * 60;

export const MIN_WEEK = 1;

/** XJTLU semesters run at most 20 teaching weeks. */
export const MAX_WEEK = 20;

export const WEEKDAYS: readonly Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export const WEEK_PARITIES: readonly WeekParity[] = ["ALL", "ODD", "EVEN"] as const;

export const WEEK_PARITY_LABELS: Record<WeekParity, string> = {
  ALL: "Every week",
  ODD: "Odd weeks",
  EVEN: "Even weeks",
};

/**
 * Reminder options from FR-CR-04: off (null), 10, 15, 30 or 60 minutes before class.
 * 15 minutes is the default.
 */
export const REMINDER_OFFSET_MINUTES = [10, 15, 30, 60] as const;

export const DEFAULT_REMINDER_OFFSET_MINUTES = 15;

/** e.g. CS101, ENT201, MTH013. */
export const COURSE_CODE_PATTERN = /^[A-Z]{2,6}\d{3}$/;

export const MAX_COURSE_NAME_LENGTH = 80;

export const MAX_TEACHER_LENGTH = 60;

export const MAX_LOCATION_LENGTH = 60;
