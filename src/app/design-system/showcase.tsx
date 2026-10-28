"use client";

import { Armchair, ChevronRight, SearchX, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  ConfirmDialog,
  DemoDataNotice,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  ListItem,
  Modal,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  TimeSlotButton,
  TypeTag,
  buttonStyles,
  cardStyles,
  toast,
} from "@/components/ui";
import { formatDateTimeRange } from "@/lib/time";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title">{title}</h2>
      {children}
    </section>
  );
}

const COLOR_TOKENS = [
  ["primary", "bg-primary"],
  ["primary-subtle", "bg-primary-subtle"],
  ["success", "bg-success-solid"],
  ["warning", "bg-warning-solid"],
  ["danger", "bg-danger-solid"],
  ["info", "bg-info-solid"],
  ["event-class", "bg-event-class"],
  ["event-office", "bg-event-office"],
  ["event-space", "bg-event-space"],
  ["lost", "bg-lost"],
  ["found", "bg-found"],
  ["text", "bg-text"],
  ["text-muted", "bg-text-muted"],
  ["border", "bg-border"],
  ["surface-muted", "bg-surface-muted"],
  ["background", "bg-background"],
] as const;

// Fixed "now" so the page can be prerendered (see the note at the top of src/lib/time.ts).
const DEMO_NOW = "2026-11-03T01:00:00Z";

const SLOTS = ["13:00–13:30", "13:30–14:00", "14:00–14:30", "14:30–15:00"];

export function Showcase() {
  const [floor, setFloor] = useState("2");
  const [slot, setSlot] = useState(SLOTS[2]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-list flex-col gap-10 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-caption tracking-wide text-primary uppercase">Internal</p>
        <h1 className="text-display">Design system</h1>
        <p className="text-text-muted">
          Shared components from <code>@/components/ui</code>. Rules:{" "}
          <code>docs/design/ui-ux-spec.md</code>.
        </p>
      </header>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_TOKENS.map(([name, bg]) => (
            <li key={name} className="flex items-center gap-2">
              <span className={`size-8 shrink-0 rounded-sm border border-border ${bg}`} />
              <code className="text-body-sm">{name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="text-display">Display 28</p>
          <p className="text-title-lg">Title large 22</p>
          <p className="text-title">Title 18</p>
          <p className="text-subtitle">Subtitle 16</p>
          <p className="text-body">Body 16 — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-body-sm text-text-muted">Body small 14 — secondary information.</p>
          <p className="text-caption">Caption 12</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Book slot</Button>
          <Button variant="secondary">View details</Button>
          <Button variant="ghost">See all</Button>
          <Button variant="danger">Cancel booking</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Booking…</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <a href="#" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Link styled as button
          </a>
        </div>
      </Section>

      <Section title="Form fields">
        <form className="flex max-w-content flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <p className="text-body-sm text-text-muted">* Required</p>
          <FormField label="Course code" hint="e.g. CPT203" required>
            <Input placeholder="CPT203" />
          </FormField>
          <FormField label="Course name" error="Course name is required" required>
            <Input />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start time">
              <Input type="time" step={1800} defaultValue="14:00" />
            </FormField>
            <FormField label="Weekday">
              <Select defaultValue="Tue">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Description" hint="Don’t include phone numbers or student IDs.">
            <Textarea />
          </FormField>
          <FormField label="Disabled">
            <Input disabled defaultValue="Read only" />
          </FormField>
        </form>
      </Section>

      <Section title="Filter chips">
        <ChipGroup label="Floor">
          {["1", "2", "3", "4", "5"].map((f) => (
            <Chip key={f} selected={floor === f} onClick={() => setFloor(f)}>
              Floor {f}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="Time slots">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SLOTS.map((s, i) => (
            <TimeSlotButton
              key={s}
              label={s}
              selected={slot === s}
              unavailableReason={i === 0 ? "Past" : i === 1 ? "Booked" : undefined}
              onClick={() => setSlot(s)}
            />
          ))}
        </div>
      </Section>

      <Section title="Badges & tags">
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="booking" status="CONFIRMED" />
          <StatusBadge kind="booking" status="CANCELLED" />
          <StatusBadge kind="slot" status="OPEN" />
          <StatusBadge kind="slot" status="CANCELLED" />
          <StatusBadge kind="post" status="CLAIM_PENDING" />
          <StatusBadge kind="claim" status="REJECTED" />
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeTag type="class" />
          <TypeTag type="office" />
          <TypeTag type="space" />
          <TypeTag type="lost" />
          <TypeTag type="found" />
        </div>
      </Section>

      <Section title="Cards & list items">
        <div className="grid gap-3 md:grid-cols-2">
          <a href="#" className={cardStyles({ interactive: true })}>
            <ListItem
              leading={
                <span className="flex size-10 items-center justify-center bg-event-office-subtle text-event-office">
                  <UserRound />
                </span>
              }
              title="Dr. Mei Chen"
              description={formatDateTimeRange(
                "2026-11-04T06:00:00Z",
                "2026-11-04T06:30:00Z",
                DEMO_NOW,
              )}
              trailing={
                <>
                  <StatusBadge kind="booking" status="CONFIRMED" />
                  <ChevronRight className="size-5 text-text-muted" aria-hidden />
                </>
              }
            />
          </a>
          <a href="#" className={cardStyles({ interactive: true })}>
            <ListItem
              leading={
                <span className="flex size-10 items-center justify-center bg-event-space-subtle text-event-space">
                  <Armchair />
                </span>
              }
              title="Seat B-12 · Floor 2"
              description="Quiet zone · power socket · 1 person"
              trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
            />
          </a>
          <Card>
            <ListItem
              leading={
                <span className="flex size-10 items-center justify-center bg-lost-subtle text-lost">
                  <SearchX />
                </span>
              }
              title="Black umbrella"
              description="Lost near the Central Building, level 3, on Monday afternoon."
              trailing={<StatusBadge kind="post" status="OPEN" />}
            />
          </Card>
        </div>
      </Section>

      <Section title="Loading">
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </Card>
      </Section>

      <Section title="Empty & error states">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <EmptyState
              title="No bookings yet"
              description="Book an office hour or a study seat to see it here."
              action={
                <a href="#" className={buttonStyles({ variant: "secondary" })}>
                  Find a space
                </a>
              }
            />
          </Card>
          <Card>
            <ErrorState kind="offline" onRetry={() => toast.info("Retrying…")} />
          </Card>
        </div>
      </Section>

      <Section title="Notices">
        <DemoDataNotice />
        <DemoDataNotice variant="footer" />
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Booking confirmed")}>
            Success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.error("This seat was just booked. Please choose another seat.")}
          >
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast.info("Reminder set for 15 min before")}>
            Info toast
          </Button>
        </div>
      </Section>

      <Section title="Modal & confirm dialog">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Cancel booking…
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm your booking"
          description="Seat B-12 · Floor 2"
          footer={
            <>
              <Button
                variant="secondary"
                fullWidth
                className="md:w-auto"
                onClick={() => setModalOpen(false)}
              >
                Back
              </Button>
              <Button
                fullWidth
                className="md:w-auto"
                loading={submitting}
                onClick={() => {
                  setSubmitting(true);
                  setTimeout(() => {
                    setSubmitting(false);
                    setModalOpen(false);
                    toast.success("Booking confirmed");
                  }, 1000);
                }}
              >
                Book seat
              </Button>
            </>
          }
        >
          <FormField label="Topic" hint="What would you like to discuss?">
            <Input />
          </FormField>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Cancel this booking?"
          description="Study Room B-2, Mon 3 Nov, 14:00–16:00. The seat will be released to others."
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          onConfirm={async () => {
            await new Promise((r) => setTimeout(r, 1000));
            setConfirmOpen(false);
            toast.success("Booking cancelled");
          }}
        />
      </Section>
    </main>
  );
}
