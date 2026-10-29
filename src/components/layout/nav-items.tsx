import Link from "next/link";
import { cn } from "@/lib/utils";
import { TABS, type TabId } from "./nav-config";

interface NavItemsProps {
  active: TabId | null;
  unreadCount?: number;
  orientation: "horizontal" | "vertical";
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="absolute -top-1 left-1/2 ml-1.5 min-w-5 rounded-full bg-danger-solid px-1 text-center text-caption leading-5 text-white">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread notifications</span>
    </span>
  );
}

/** Tab links shared by BottomNav and SideNav. */
export function NavItems({ active, unreadCount = 0, orientation }: NavItemsProps) {
  const vertical = orientation === "vertical";
  return (
    <ul className={cn("flex", vertical ? "flex-col gap-1" : "h-full items-stretch")}>
      {TABS.map(({ id, label, href, icon: Icon }) => {
        const selected = id === active;
        return (
          <li key={id} className={cn(!vertical && "flex-1")}>
            <Link
              href={href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex items-center transition-colors duration-150",
                vertical
                  ? "h-11 gap-3 rounded-sm px-3 text-body font-medium"
                  : "h-full flex-col justify-center gap-0.5 text-caption",
                selected
                  ? cn("text-primary", vertical && "bg-primary-subtle")
                  : cn("text-text-muted hover:text-text", vertical && "hover:bg-surface-muted"),
              )}
            >
              <span className="relative">
                <Icon
                  className={vertical ? "size-5" : "size-6"}
                  strokeWidth={selected ? 2.25 : 1.75}
                  aria-hidden
                />
                {id === "home" && unreadCount > 0 && <UnreadBadge count={unreadCount} />}
              </span>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
