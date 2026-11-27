import { FlaskConical } from "lucide-react";

/** Marks the development preview; fixtures must never look real. */
export function PreviewBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-md border border-warning bg-warning-subtle px-4 py-3 text-warning"
    >
      <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-body-sm font-semibold">Development preview · fictional data</p>
        <p className="text-body-sm text-text">
          Signing in with this form isn’t connected yet. Don’t enter your real university password:
          nothing here is sent to the university.
        </p>
      </div>
    </div>
  );
}
