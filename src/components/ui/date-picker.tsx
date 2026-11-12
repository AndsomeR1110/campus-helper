"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type AriaAttributes, type KeyboardEvent } from "react";
import { dayKey, formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { controlClasses, useFieldControlProps } from "./form-field";
import { IconButton } from "./icon-button";
import { Modal } from "./modal";
import { TimeSelect } from "./time-select";

/* ---- Pure calendar helpers (yyyy-mm-dd keys, no time zone involved) ------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(key: string, days: number) {
  return fromUtc(toUtc(key) + days * DAY_MS);
}

/** Same day in another month, clamped to that month's length ("2026-03-31" −1 → "2026-02-28"). */
export function addMonths(key: string, months: number) {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return fromUtc(target.getTime());
}

/** The 42 days (6 weeks, Monday first) shown for the month containing `key`. */
export function monthGrid(key: string): string[] {
  const first = `${key.slice(0, 7)}-01`;
  const offset = (new Date(toUtc(first)).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function clampDay(key: string, min?: string, max?: string) {
  if (min && key < min) return min;
  if (max && key > max) return max;
  return key;
}

/** "Thu 12 Nov 2026" */
function formatLong(key: string) {
  return `${formatDate(`${key}T12:00:00+08:00`)} ${key.slice(0, 4)}`;
}

/** "Thursday, 12 November 2026", for screen readers. */
function formatSpoken(key: string) {
  const d = new Date(toUtc(key));
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getUTCDay()
  ];
  return `${weekday}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "today" resolves to the current Asia/Shanghai day when the picker opens. */
type Bound = string | "today";
const resolve = (bound: Bound | undefined, today: string) => (bound === "today" ? today : bound);

/* ---- DatePicker ---------------------------------------------------------- */

export interface DatePickerProps extends Pick<
  AriaAttributes,
  "aria-describedby" | "aria-invalid" | "aria-label"
> {
  /** yyyy-mm-dd, or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day (yyyy-mm-dd or "today"). */
  min?: Bound;
  /** Latest selectable day (yyyy-mm-dd or "today"). */
  max?: Bound;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  className?: string;
}

/**
 * Calendar date picker (ui-ux-spec §4.17) for dates that may be far away, such
 * as when an item was lost. Opens a month calendar in a bottom sheet (dialog
 * on tablet / desktop) with month and year jumps and Today / Yesterday /
 * Tomorrow shortcuts. Fully keyboard-operable: arrow keys move by day / week,
 * Page Up / Down by month, Home / End to the week's start / end.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Choose a date",
  disabled,
  className,
  ...props
}: DatePickerProps) {
  const field = useFieldControlProps(props);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [focusDay, setFocusDay] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const lo = resolve(min, today);
  const hi = resolve(max, today);
  const inRange = (key: string) => (!lo || key >= lo) && (!hi || key <= hi);

  function openPicker() {
    // Read the clock only on user action, never during render (Cache Components).
    const now = dayKey(new Date());
    setToday(now);
    setFocusDay(clampDay(value || now, resolve(min, now), resolve(max, now)));
    setOpen(true);
  }

  function choose(key: string) {
    onChange(key);
    setOpen(false);
  }

  useEffect(() => {
    if (!moveFocus.current || !open) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, open]);

  function goTo(key: string, focus = true) {
    moveFocus.current = focus;
    setFocusDay(clampDay(key, lo, hi));
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
      Home: () => addDays(focusDay, -((new Date(toUtc(focusDay)).getUTCDay() + 6) % 7)),
      End: () => addDays(focusDay, 6 - ((new Date(toUtc(focusDay)).getUTCDay() + 6) % 7)),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    goTo(move());
  }

  const days = focusDay ? monthGrid(focusDay) : [];
  const viewMonth = focusDay.slice(0, 7);
  const viewYear = Number(focusDay.slice(0, 4));
  const firstYear = lo ? Number(lo.slice(0, 4)) : viewYear - 5;
  const lastYear = hi ? Number(hi.slice(0, 4)) : viewYear + 5;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const prevMonthEnd = focusDay ? addDays(`${viewMonth}-01`, -1) : "";
  const nextMonthStart = focusDay ? addMonths(`${viewMonth}-01`, 1) : "";

  const shortcuts = today
    ? [
        { label: "Yesterday", key: addDays(today, -1) },
        { label: "Today", key: today },
        { label: "Tomorrow", key: addDays(today, 1) },
      ].filter((s) => inRange(s.key))
    : [];

  return (
    <>
      <button
        type="button"
        id={field.id}
        aria-describedby={field["aria-describedby"]}
        aria-label={props["aria-label"]}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={openPicker}
        className={cn(
          controlClasses,
          "flex h-11 items-center gap-2 pl-3 text-left",
          !value && "text-text-disabled",
          // Buttons can't carry aria-invalid; the FormField error text is linked via aria-describedby.
          field["aria-invalid"] && "border-danger",
          className,
        )}
      >
        <CalendarDays className="size-5 shrink-0 text-text-muted" aria-hidden />
        <span className="flex-1 truncate tabular-nums">
          {value ? formatLong(value) : placeholder}
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a date"
        footer={
          value ? (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep {formatLong(value)}
            </Button>
          ) : undefined
        }
      >
        {focusDay && (
          <div className="flex flex-col gap-4 pb-4 md:pb-2">
            {shortcuts.length > 0 && (
              <div className="flex gap-2">
                {shortcuts.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => choose(s.key)}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-body-sm font-medium transition-colors duration-150",
                      s.key === value
                        ? "border-primary bg-primary-subtle text-primary"
                        : "border-border-strong bg-surface text-text hover:bg-surface-muted",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1">
              <IconButton
                aria-label="Previous month"
                disabled={!!lo && prevMonthEnd < lo}
                onClick={() => goTo(addMonths(focusDay, -1), false)}
              >
                <ChevronLeft />
              </IconButton>
              <div className="flex flex-1 justify-center gap-2">
                <select
                  aria-label="Month"
                  value={Number(focusDay.slice(5, 7)) - 1}
                  onChange={(e) =>
                    goTo(
                      addMonths(
                        focusDay,
                        Number(e.target.value) - (Number(focusDay.slice(5, 7)) - 1),
                      ),
                      false,
                    )
                  }
                  className="h-9 appearance-none rounded-full bg-surface-muted px-3 text-subtitle text-text"
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Year"
                  value={viewYear}
                  onChange={(e) =>
                    goTo(addMonths(focusDay, (Number(e.target.value) - viewYear) * 12), false)
                  }
                  className="h-9 appearance-none rounded-full bg-surface-muted px-3 text-subtitle text-text tabular-nums"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <IconButton
                aria-label="Next month"
                disabled={!!hi && nextMonthStart > hi}
                onClick={() => goTo(addMonths(focusDay, 1), false)}
              >
                <ChevronRight />
              </IconButton>
            </div>

            <div
              ref={gridRef}
              role="group"
              aria-label={`${MONTHS[Number(focusDay.slice(5, 7)) - 1]} ${viewYear}`}
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-7 gap-y-1 text-center"
            >
              {WEEKDAYS.map((d) => (
                <span key={d} aria-hidden className="pb-1 text-caption text-text-muted">
                  {d}
                </span>
              ))}
              {days.map((key) => {
                const outside = key.slice(0, 7) !== viewMonth;
                const selected = key === value;
                const isToday = key === today;
                const enabled = inRange(key);
                return (
                  <div key={key} className="flex justify-center">
                    <button
                      type="button"
                      data-day={key}
                      tabIndex={key === focusDay ? 0 : -1}
                      disabled={!enabled}
                      aria-label={formatSpoken(key)}
                      aria-pressed={selected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => choose(key)}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full text-body tabular-nums transition-colors duration-150",
                        "disabled:cursor-not-allowed disabled:text-text-disabled disabled:opacity-50",
                        selected
                          ? "bg-primary font-semibold text-on-primary shadow-primary"
                          : cn(
                              "hover:bg-surface-muted",
                              outside ? "text-text-disabled" : "text-text",
                              isToday && "font-semibold text-primary ring-1 ring-primary/50",
                            ),
                      )}
                    >
                      {Number(key.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ---- DateTimePicker ------------------------------------------------------ */

export interface DateTimePickerProps extends Omit<DatePickerProps, "value" | "onChange"> {
  /** "yyyy-mm-ddTHH:mm" (like datetime-local), or "" until both parts are chosen. */
  value: string;
  onChange: (value: string) => void;
  /** Time options, "HH:mm". Defaults: 00:00–23:30 every 30 minutes. */
  timeFrom?: string;
  timeTo?: string;
  timeStep?: number;
}

/**
 * Calendar date + 24h time, replacing `<input type="datetime-local">`
 * (ui-ux-spec §4.17). Emits the same "yyyy-mm-ddTHH:mm" string, and "" while
 * either part is missing, so existing conversions keep working.
 * Put it inside one FormField: the label targets the date button.
 */
export function DateTimePicker({
  value,
  onChange,
  timeFrom = "00:00",
  timeTo = "23:30",
  timeStep = 30,
  ...props
}: DateTimePickerProps) {
  const field = useFieldControlProps(props);
  const [date, setDate] = useState(value.slice(0, 10));
  const [time, setTime] = useState(value.slice(11, 16));
  const [seen, setSeen] = useState(value);

  // Follow the parent's value (e.g. a reset to "" after submitting).
  if (value !== seen) {
    setSeen(value);
    if (value) {
      setDate(value.slice(0, 10));
      setTime(value.slice(11, 16));
    } else if (date && time) {
      setDate("");
      setTime("");
    }
  }

  function update(nextDate: string, nextTime: string) {
    setDate(nextDate);
    setTime(nextTime);
    const next = nextDate && nextTime ? `${nextDate}T${nextTime}` : "";
    setSeen(next);
    if (next !== value) onChange(next);
  }

  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
      <DatePicker {...props} {...field} value={date} onChange={(d) => update(d, time)} />
      <TimeSelect
        id={field.id ? `${field.id}-time` : undefined}
        aria-label="Time"
        aria-describedby={field["aria-describedby"]}
        aria-invalid={field["aria-invalid"]}
        disabled={props.disabled}
        from={timeFrom}
        to={timeTo}
        step={timeStep}
        placeholder="Time"
        value={time}
        onChange={(event) => update(date, event.target.value)}
      />
    </div>
  );
}
