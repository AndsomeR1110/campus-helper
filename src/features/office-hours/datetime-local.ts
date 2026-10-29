/**
 * `<input type="datetime-local">` 与 UTC ISO 之间的转换。
 *
 * 为什么放在模块内而不是 `src/lib/time.ts`：
 * 那个文件由 Member 1 维护（见 CONTRIBUTING.md 第 4 节代码所有权表），
 * 只有在确实需要跨模块复用时才提 PR 加进去。
 */
import { APP_TIME_ZONE } from "@/lib/time";

/** UTC ISO → Asia/Shanghai 的 `YYYY-MM-DDTHH:mm`（供表单默认值使用） */
export function toDateTimeLocalValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * `datetime-local` 的值（按 Asia/Shanghai 理解）→ UTC ISO。
 * Asia/Shanghai 无夏令时，固定 UTC+8，因此可以安全地拼接偏移。
 */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(`${value}:00+08:00`).toISOString();
}
