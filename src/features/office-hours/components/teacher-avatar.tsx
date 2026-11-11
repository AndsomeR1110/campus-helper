/** Initials in the Office Hour colour, so teachers read as people, not files. */
export function TeacherAvatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, "")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={
        size === "lg"
          ? "flex size-16 shrink-0 items-center justify-center rounded-full bg-event-office-subtle text-title text-event-office ring-4 ring-surface"
          : "flex size-12 shrink-0 items-center justify-center rounded-full bg-event-office-subtle text-subtitle text-event-office"
      }
    >
      {initials || "?"}
    </span>
  );
}
