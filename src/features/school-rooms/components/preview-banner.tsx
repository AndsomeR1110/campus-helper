import { FlaskConical } from "lucide-react";

/** Marks every development preview screen; fixtures must never look real. */
export function PreviewBanner({ service }: { service: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-md border border-warning bg-warning-subtle px-4 py-3 text-warning"
    >
      <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-body-sm font-semibold">Development preview · fictional data</p>
        <p className="text-body-sm text-text">
          {service} isn’t connected to the school yet. Nothing here is sent to the school, and no
          booking is real.
        </p>
      </div>
    </div>
  );
}
