import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  neutral: "bg-neutral-subtle text-neutral",
};

/**
 * The single source of truth for status colours and labels (ui-ux-spec §2.2).
 * Enum values must match the Prisma schema; update both together.
 */
export const STATUS_MAP = {
  booking: {
    CONFIRMED: { label: "Confirmed", tone: "success" },
    COMPLETED: { label: "Completed", tone: "neutral" },
    CANCELLED: { label: "Cancelled", tone: "neutral" },
    EXPIRED: { label: "Expired", tone: "neutral" },
  },
  slot: {
    OPEN: { label: "Available", tone: "info" },
    BOOKED: { label: "Booked", tone: "neutral" },
    CANCELLED: { label: "Withdrawn", tone: "danger" },
  },
  post: {
    OPEN: { label: "Open", tone: "info" },
    CLAIM_PENDING: { label: "Claim pending", tone: "warning" },
    RESOLVED: { label: "Resolved", tone: "success" },
    CLOSED: { label: "Closed", tone: "neutral" },
    HIDDEN: { label: "Hidden", tone: "danger" },
  },
  claim: {
    PENDING: { label: "Pending", tone: "warning" },
    APPROVED: { label: "Approved", tone: "success" },
    REJECTED: { label: "Rejected", tone: "danger" },
  },
  report: {
    PENDING: { label: "Pending", tone: "warning" },
    RESOLVED: { label: "Resolved", tone: "success" },
    DISMISSED: { label: "Dismissed", tone: "neutral" },
  },
} as const satisfies Record<string, Record<string, { label: string; tone: Tone }>>;

export type StatusKind = keyof typeof STATUS_MAP;
export type StatusOf<K extends StatusKind> = keyof (typeof STATUS_MAP)[K];

export interface StatusBadgeProps<K extends StatusKind> {
  kind: K;
  status: StatusOf<K>;
  className?: string;
}

export function StatusBadge<K extends StatusKind>({
  kind,
  status,
  className,
}: StatusBadgeProps<K>) {
  const { label, tone } = STATUS_MAP[kind][status] as { label: string; tone: Tone };
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
