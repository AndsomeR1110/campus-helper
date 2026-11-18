"use client";
import { useLocale, useTranslations } from "@/lib/i18n/client";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Chip,
  ChipGroup,
  DateStrip,
  FormField,
  Select,
  TimeSelect,
  cardStyles,
} from "@/components/ui";
import type { Locale } from "@/lib/i18n/messages";
import { dayKey, formatDate } from "@/lib/time";
import { SEAT_TYPE_LABELS } from "../constants";
import type { SeatType, Space } from "../types";

/** "Thu 12 Nov · 10:00–11:00", from the URL query, for the collapsed search bar. */
function searchSummary(params: URLSearchParams, locale: Locale) {
  const date = params.get("date");
  const start = params.get("start");
  const end = params.get("end");
  if (!date || !start || !end) return null;
  return `${formatDate(`${date}T12:00:00+08:00`, locale)} · ${start}–${end}`;
}

export function SpaceFilterForm({
  query,
  action = "/spaces",
  catalog,
  today,
}: {
  query: string;
  action?: string;
  catalog?: readonly Space[];
  /** yyyy-mm-dd in Asia/Shanghai; first day of the date strip. */
  today?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const params = new URLSearchParams(query);
  const [type, setType] = useState(params.get("type") ?? "");
  const summary = searchSummary(params, locale);
  const floor = params.get("floor");
  const seatType = params.get("type") as SeatType | null;
  const extras = [
    params.get("building"),
    floor && t("Floor {floor}", { floor }),
    seatType && SEAT_TYPE_LABELS[seatType] && t(SEAT_TYPE_LABELS[seatType]),
  ].filter(Boolean);
  const firstDay = today ?? dayKey(new Date());

  return (
    <details
      open={!summary}
      className={cardStyles({ variant: "widget", className: "group p-0 [&_summary]:list-none" })}
    >
      <summary className="flex cursor-pointer items-center gap-3 rounded-lg p-4 select-none [&::-webkit-details-marker]:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-event-space-subtle text-event-space">
          <SlidersHorizontal className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-subtitle tabular-nums">
            {summary ?? t("Choose a date and time")}
          </span>
          <span className="truncate text-body-sm text-text-muted">
            {catalog ? (extras.length ? extras.join(" · ") : t("All seats")) : t("Change the time")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-body-sm font-medium text-primary">
          <span className="group-open:hidden">{t("Change")}</span>
          <span className="hidden group-open:inline">{t("Close")}</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <form
        action={action}
        method="get"
        className="flex min-w-0 flex-col gap-4 border-t border-liquid-edge p-4"
      >
        <DateStrip
          name="date"
          label={t("Date")}
          start={firstDay}
          days={7}
          defaultValue={params.get("date") || undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t("Start")} required>
            <TimeSelect name="start" defaultValue={params.get("start") ?? ""} />
          </FormField>
          <FormField label={t("End")} required>
            <TimeSelect name="end" defaultValue={params.get("end") ?? ""} />
          </FormField>
        </div>
        {catalog ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("Building")}>
                <Select name="building" defaultValue={params.get("building") ?? ""}>
                  <option value="">{t("All buildings")}</option>
                  {[
                    ...new Set(
                      [...catalog.map((s) => s.building), params.get("building")].filter(
                        (v): v is string => !!v,
                      ),
                    ),
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t("Floor")}>
                <Select name="floor" defaultValue={params.get("floor") ?? ""}>
                  <option value="">{t("All floors")}</option>
                  {[
                    ...new Set(
                      [...catalog.map((s) => String(s.floor)), params.get("floor")].filter(
                        (v): v is string => !!v,
                      ),
                    ),
                  ]
                    .sort()
                    .map((v) => (
                      <option key={v} value={v}>
                        {t("Floor")} {v}
                      </option>
                    ))}
                </Select>
              </FormField>
            </div>
            <input type="hidden" name="type" value={type} />
            <div className="min-w-0">
              <ChipGroup label={t("Seat type")}>
                <Chip selected={!type} onClick={() => setType("")}>
                  {t("All types")}
                </Chip>
                {Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => (
                  <Chip key={value} selected={type === value} onClick={() => setType(value)}>
                    {t(label)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          </>
        ) : (
          ["building", "floor", "type"].map((name) => (
            <input key={name} type="hidden" name={name} value={params.get(name) ?? ""} />
          ))
        )}
        <p className="text-caption text-text-muted">
          {t("30-minute steps · 30–180 minutes · within the next 7 days. Times in Asia/Shanghai.")}
        </p>
        <Button type="submit">{catalog ? t("Find seats") : t("Update time")}</Button>
      </form>
    </details>
  );
}
