"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  Button,
  cardStyles,
  DateTimePicker,
  FormField,
  Input,
  toast,
  useOffline,
} from "@/components/ui";
import { fromDateTimeLocalValue } from "@/features/office-hours";
import { createSlotSchema } from "@/features/office-hours";

/** "yyyy-mm-ddTHH:mm" + minutes, as wall-clock arithmetic (no time zone involved). */
function plusMinutes(local: string, minutes: number) {
  const next = new Date(Date.parse(`${local}:00Z`) + minutes * 60_000);
  return next.toISOString().slice(0, 16);
}

/**
 * Teacher slot creation form (PG-07 / OH-AC-06).
 * Times are entered in Asia/Shanghai and converted to UTC before submitting.
 */
export function SlotForm() {
  const router = useRouter();
  const offline = useOffline();
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (!startsAt || !endsAt) {
      setFieldErrors({ startsAt: "Both start and end time are required." });
      return;
    }

    const parsed = createSlotSchema.safeParse({
      startsAt: fromDateTimeLocalValue(startsAt),
      endsAt: fromDateTimeLocalValue(endsAt),
      location: location || undefined,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/office-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as
        | { data: unknown }
        | { error: { code: string; message: string; fields?: Record<string, string> } };

      if (!response.ok || "error" in payload) {
        if ("error" in payload) {
          toast.error(payload.error.message);
          if (payload.error.fields) setFieldErrors(payload.error.fields);
        } else {
          toast.error("Could not create the slot.");
        }
        return;
      }

      toast.success("Slot created.");
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cardStyles({ variant: "widget", className: "flex flex-col gap-4" })}
      noValidate
    >
      <h2 className="text-subtitle text-text">Add an office hour slot</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Starts (Asia/Shanghai)" error={fieldErrors.startsAt}>
          <DateTimePicker
            value={startsAt}
            onChange={(value) => {
              setStartsAt(value);
              // Suggest a 30-minute slot the first time a start is chosen.
              if (value && !endsAt) setEndsAt(plusMinutes(value, 30));
            }}
            min="today"
            timeFrom="07:00"
            timeTo="22:00"
            timeStep={15}
          />
        </FormField>
        <FormField label="Ends" error={fieldErrors.endsAt}>
          <DateTimePicker
            value={endsAt}
            onChange={setEndsAt}
            min="today"
            timeFrom="07:00"
            timeTo="22:00"
            timeStep={15}
          />
        </FormField>
      </div>

      <FormField label="Location (optional)" hint="e.g. B-301">
        <Input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="B-301"
        />
      </FormField>

      <div className="flex flex-col gap-1">
        <Button type="submit" loading={submitting} disabled={offline} className="self-start">
          {submitting ? "Creating…" : "Create slot"}
        </Button>
        {offline && <p className="text-body-sm text-text-muted">Unavailable offline.</p>}
      </div>
    </form>
  );
}
