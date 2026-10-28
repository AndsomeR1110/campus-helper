import {
  Armchair,
  BookOpen,
  PackageCheck,
  SearchX,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = {
  class: { label: "Class", icon: BookOpen, className: "bg-event-class-subtle text-event-class" },
  office: {
    label: "Office Hour",
    icon: UserRound,
    className: "bg-event-office-subtle text-event-office",
  },
  space: {
    label: "Study Space",
    icon: Armchair,
    className: "bg-event-space-subtle text-event-space",
  },
  lost: { label: "Lost", icon: SearchX, className: "bg-lost-subtle text-lost" },
  found: { label: "Found", icon: PackageCheck, className: "bg-found-subtle text-found" },
} as const satisfies Record<string, { label: string; icon: LucideIcon; className: string }>;

export type TagType = keyof typeof TYPES;

/** The icon for an event type or post type. Pair it with text so meaning never relies on colour alone. */
export function TypeIcon({ type, className }: { type: TagType; className?: string }) {
  const Icon = TYPES[type].icon;
  return <Icon className={className} aria-hidden />;
}

/** Text + background classes for a type, e.g. to tint a schedule block. */
export function typeColorClasses(type: TagType) {
  return TYPES[type].className;
}

export function TypeTag({ type, className }: { type: TagType; className?: string }) {
  const { label, icon: Icon, className: colors } = TYPES[type];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-caption whitespace-nowrap",
        colors,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
