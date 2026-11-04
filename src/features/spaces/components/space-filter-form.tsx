"use client";
import { useState } from "react";
import { Button, Chip, ChipGroup, FormField, Input, Select } from "@/components/ui";
import { SEAT_TYPE_LABELS } from "../constants";
import type { Space } from "../types";

export function SpaceFilterForm({
  query,
  action = "/spaces",
  catalog,
}: {
  query: string;
  action?: string;
  catalog?: readonly Space[];
}) {
  const params = new URLSearchParams(query);
  const [type, setType] = useState(params.get("type") ?? "");
  return (
    <form action={action} method="get" className="grid min-w-0 gap-4 md:grid-cols-3">
      <FormField label="Date" required>
        <Input name="date" type="date" defaultValue={params.get("date") ?? ""} />
      </FormField>
      <FormField label="Start time" required>
        <Input name="start" type="time" step="1800" defaultValue={params.get("start") ?? ""} />
      </FormField>
      <FormField label="End time" required>
        <Input name="end" type="time" step="1800" defaultValue={params.get("end") ?? ""} />
      </FormField>
      {catalog ? (
        <>
          <FormField label="Building">
            <Select name="building" defaultValue={params.get("building") ?? ""}>
              <option value="">All buildings</option>
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
          <FormField label="Floor">
            <Select name="floor" defaultValue={params.get("floor") ?? ""}>
              <option value="">All floors</option>
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
                    Floor {v}
                  </option>
                ))}
            </Select>
          </FormField>
          <input type="hidden" name="type" value={type} />
          <div className="min-w-0 md:col-span-3">
            <ChipGroup label="Seat type">
              <Chip selected={!type} onClick={() => setType("")}>
                All types
              </Chip>
              {Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => (
                <Chip key={value} selected={type === value} onClick={() => setType(value)}>
                  {label}
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
      <Button type="submit" variant="secondary">
        {catalog ? "Find seats" : "Update time"}
      </Button>
    </form>
  );
}
