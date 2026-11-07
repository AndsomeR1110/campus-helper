"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, FormField, Input, toast } from "@/components/ui";
import { fromDateTimeLocalValue } from "@/features/office-hours";
import { createSlotSchema } from "@/features/office-hours";

/**
 * Teacher slot creation form (PG-07 / OH-AC-06).
 * Times are entered in Asia/Shanghai and converted to UTC before submitting.
 */
export function SlotForm() {
  const router = useRouter();
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
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-card"
      noValidate
    >
      <h2 className="text-subtitle text-text">Add an office hour slot</h2>

      <div className="flex flex-col gap-4 sm:flex-row">
        <FormField label="Starts (Asia/Shanghai)" error={fieldErrors.startsAt} className="flex-1">
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </FormField>
        <FormField label="Ends" error={fieldErrors.endsAt} className="flex-1">
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
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

      <Button type="submit" loading={submitting} className="self-start">
        {submitting ? "Creating…" : "Create slot"}
      </Button>
    </form>
  );
}
