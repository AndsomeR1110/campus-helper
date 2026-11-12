"use client";

import { BookOpen, Clock, Trash2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer, StickyActionBar, TopBar } from "@/components/layout";
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  Chip,
  ChipGroup,
  Select,
  TimeSelect,
  toast,
  useOffline,
} from "@/components/ui";
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  MAX_TEACHER_LENGTH,
  MAX_WEEK,
  MIN_WEEK,
  REMINDER_OFFSET_MINUTES,
  WEEKDAYS,
  WEEKDAY_LABELS,
  WEEK_PARITIES,
  WEEK_PARITY_LABELS,
  validateCourseDraft,
  type Course,
  type CourseDraft,
} from "@/features/courses";

type FieldErrors = Partial<Record<keyof CourseDraft | "form", string>>;

function toDraft(course?: Course): CourseDraft {
  return {
    code: course?.code ?? "",
    name: course?.name ?? "",
    teacher: course?.teacher ?? "",
    location: course?.location ?? "",
    weekday: course?.weekday ?? "MONDAY",
    startTime: course?.startTime ?? "09:00",
    endTime: course?.endTime ?? "10:30",
    firstWeek: course?.firstWeek ?? 1,
    lastWeek: course?.lastWeek ?? 16,
    weekParity: course?.weekParity ?? "ALL",
    reminderOffsetMinutes: DEFAULT_REMINDER_OFFSET_MINUTES,
  };
}

export interface CourseFormProps {
  /** Undefined means "create". */
  course?: Course;
}

/** PG-12 course editor (FR-CR-01, CR-AC-02, FR-CR-04). */
export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const offline = useOffline();
  const [draft, setDraft] = useState<CourseDraft>(() => toDraft(course));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editing = Boolean(course);

  function update<K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(): boolean {
    const result = validateCourseDraft(draft);
    if (result.ok) {
      setErrors({});
      return true;
    }

    const next: FieldErrors = {};
    for (const error of result.errors) {
      if (error.field === "general") {
        next.form = error.message;
      } else {
        next[error.field] ??= error.message;
      }
    }
    setErrors(next);
    return false;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/courses/${course?.id}` : "/api/courses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();

      if (!response.ok) {
        const fields = payload?.error?.fields as Record<string, string> | undefined;
        setErrors((current) => ({ ...current, ...fields, form: payload?.error?.message }));
        toast.error(payload?.error?.message ?? "Could not save the course.");
        return;
      }

      toast.success(editing ? "Course updated" : "Course added");
      router.push("/courses");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!course) return;

    try {
      const response = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Could not delete the course.");
      }

      toast.success("Course deleted");
      setConfirmingDelete(false);
      router.push("/courses");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the course.");
      throw error;
    }
  }

  return (
    <>
      <TopBar
        title={editing ? "Edit course" : "Add course"}
        backHref="/courses"
        actions={
          editing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete course"
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          ) : undefined
        }
      />
      <PageContainer width="content">
        <form id="course-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Card className="flex flex-col gap-4">
            <SectionHeading icon={BookOpen} title="Course" />
            <FormField label="Course code" error={errors.code} hint="For example CS101" required>
              <Input
                value={draft.code}
                onChange={(event) => update("code", event.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="CS101"
              />
            </FormField>

            <FormField label="Course name" error={errors.name} required>
              <Input
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="off"
                placeholder="Database Systems"
              />
            </FormField>

            <FormField label="Teacher" hint="Optional" error={errors.teacher}>
              <Input
                value={draft.teacher}
                onChange={(event) => update("teacher", event.target.value)}
                maxLength={MAX_TEACHER_LENGTH}
                autoComplete="off"
                placeholder="Dr. Wang"
              />
            </FormField>

            <FormField label="Classroom" hint="Optional" error={errors.location}>
              <Input
                value={draft.location}
                onChange={(event) => update("location", event.target.value)}
                autoComplete="off"
                placeholder="Library D, 1F"
              />
            </FormField>
          </Card>

          <Card className="flex flex-col gap-4">
            <SectionHeading icon={Clock} title="When" />
            <div className="flex flex-col gap-1.5">
              <ChipGroup label="Weekday" className="md:flex-wrap">
                {WEEKDAYS.map((day) => (
                  <Chip
                    key={day}
                    selected={draft.weekday === day}
                    aria-label={WEEKDAY_LABELS[day]}
                    onClick={() => update("weekday", day)}
                  >
                    {WEEKDAY_LABELS[day].slice(0, 3)}
                  </Chip>
                ))}
              </ChipGroup>
              {errors.weekday && (
                <p role="alert" className="text-body-sm text-danger">
                  {errors.weekday}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Starts" error={errors.startTime} required>
                <TimeSelect
                  from="07:00"
                  to="22:45"
                  step={15}
                  placeholder="Select"
                  value={draft.startTime}
                  onChange={(event) => update("startTime", event.target.value)}
                />
              </FormField>

              <FormField label="Ends" error={errors.endTime} required>
                <TimeSelect
                  from="07:00"
                  to="22:45"
                  step={15}
                  placeholder="Select"
                  value={draft.endTime}
                  onChange={(event) => update("endTime", event.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="First week" error={errors.firstWeek} required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_WEEK}
                  max={MAX_WEEK}
                  value={draft.firstWeek}
                  onChange={(event) => update("firstWeek", Number(event.target.value))}
                />
              </FormField>

              <FormField label="Last week" error={errors.lastWeek} required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_WEEK}
                  max={MAX_WEEK}
                  value={draft.lastWeek}
                  onChange={(event) => update("lastWeek", Number(event.target.value))}
                />
              </FormField>
            </div>

            <FormField label="Week pattern" error={errors.weekParity}>
              <Select
                value={draft.weekParity}
                onChange={(event) =>
                  update("weekParity", event.target.value as CourseDraft["weekParity"])
                }
              >
                {WEEK_PARITIES.map((parity) => (
                  <option key={parity} value={parity}>
                    {WEEK_PARITY_LABELS[parity]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Remind me"
              hint="A notification before the class starts"
              error={errors.reminderOffsetMinutes}
            >
              <Select
                value={draft.reminderOffsetMinutes ?? "off"}
                onChange={(event) =>
                  update(
                    "reminderOffsetMinutes",
                    event.target.value === "off" ? null : Number(event.target.value),
                  )
                }
              >
                <option value="off">Off</option>
                {REMINDER_OFFSET_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes before
                  </option>
                ))}
              </Select>
            </FormField>
          </Card>

          {errors.form && (
            <p role="alert" className="text-body-sm text-danger">
              {errors.form}
            </p>
          )}

          {offline && <p className="text-body-sm text-text-muted">Unavailable offline.</p>}
        </form>
      </PageContainer>

      <StickyActionBar
        summary={
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {WEEKDAY_LABELS[draft.weekday]} · {draft.startTime}–{draft.endTime}
          </span>
        }
      >
        <Button
          type="submit"
          form="course-form"
          size="lg"
          fullWidth
          loading={saving}
          disabled={offline}
        >
          {editing ? "Save changes" : "Add course"}
        </Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this course?"
        description="Its classes and reminders will be removed from your timetable. This cannot be undone."
        confirmLabel="Delete course"
        onConfirm={handleDelete}
      />
    </>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-subtitle">
      <span className="flex size-8 items-center justify-center rounded-sm bg-event-class-subtle text-event-class">
        <Icon className="size-4" aria-hidden />
      </span>
      {title}
    </h2>
  );
}
