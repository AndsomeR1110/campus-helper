"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Calendar arithmetic on yyyy-mm-dd keys (no time zone involved). */
function addDays(key: string, days: number) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function parts(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  return { weekday: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] };
}

export interface DateStripProps {
  /** Form field name; the value is submitted as yyyy-mm-dd. */
  name: string;
  /** Accessible group label, e.g. "Date". */
  label: string;
  /** First day shown (yyyy-mm-dd, Asia/Shanghai), usually today from `dayKey(now)`. */
  start: string;
  /** Number of days, counting forward (or backward with `direction="past"`). */
  days?: number;
  direction?: "future" | "past";
  defaultValue?: string;
  /** Labels the first day "Today" (and the next "Tomorrow" / "Yesterday"). */
  startIsToday?: boolean;
  onChange?: (value: string) => void;
}

/**
 * Horizontally scrolling day picker (ui-ux-spec §4.17) in place of a native
 * date input, which shows US formats on many phones. Submits a hidden input.
 */
export function DateStrip({
  name,
  label,
  start,
  days = 7,
  direction = "future",
  defaultValue,
  startIsToday = true,
  onChange,
}: DateStripProps) {
  const keys = Array.from({ length: days }, (_, i) =>
    addDays(start, direction === "future" ? i : -i),
  );
  if (defaultValue && !keys.includes(defaultValue)) keys.unshift(defaultValue);
  const [value, setValue] = useState(defaultValue ?? keys[0]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-body-sm font-medium text-text" id={`${name}-label`}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${name}-label`}
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:px-0"
      >
        {keys.map((key, index) => {
          const selected = key === value;
          const p = parts(key);
          const relative =
            startIsToday && key === start
              ? "Today"
              : startIsToday &&
                  index === 1 &&
                  key === addDays(start, direction === "future" ? 1 : -1)
                ? direction === "future"
                  ? "Tomorrow"
                  : "Yesterday"
                : p.weekday;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={`${relative === p.weekday ? p.weekday : relative}, ${p.day} ${p.month}`}
              onClick={() => {
                setValue(key);
                onChange?.(key);
              }}
              className={cn(
                "flex h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-md border px-2 transition-[background-color,border-color,box-shadow] duration-150",
                selected
                  ? "border-primary bg-primary text-on-primary shadow-primary"
                  : "border-border bg-surface text-text hover:border-border-strong",
              )}
            >
              <span
                className={cn("text-caption", selected ? "text-on-primary/85" : "text-text-muted")}
              >
                {relative}
              </span>
              <span className="text-title tabular-nums">{p.day}</span>
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
