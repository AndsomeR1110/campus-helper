"use client";

import { Select, type SelectProps } from "./select";

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export interface TimeSelectProps extends Omit<SelectProps, "children"> {
  /** First option, "HH:mm". Default 07:00. */
  from?: string;
  /** Last option, "HH:mm". Default 23:00. */
  to?: string;
  /** Minutes between options. Default 30. */
  step?: number;
  /** Optional empty first option, e.g. "Any time". */
  placeholder?: string;
}

/**
 * 24-hour time picker (ui-ux-spec §4.17). Native time inputs show "10:00 PM"
 * on many devices; this always lists "22:00". Put it inside a FormField.
 */
export function TimeSelect({
  from = "07:00",
  to = "23:00",
  step = 30,
  placeholder,
  defaultValue,
  value,
  ...props
}: TimeSelectProps) {
  const options: string[] = [];
  for (let m = toMinutes(from); m <= toMinutes(to); m += step) options.push(toTime(m));
  const current = String(value ?? defaultValue ?? "");
  if (current && !options.includes(current)) options.unshift(current);
  return (
    <Select
      {...props}
      {...(value !== undefined ? { value } : { defaultValue })}
      className="tabular-nums"
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  );
}
