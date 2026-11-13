import { cn } from "@/lib/utils";

/**
 * CAMPUS HELPER mark: mortarboard with a map-pin tassel. Same art as
 * src/app/icon.svg and the PWA icons; brand colours stay fixed in both themes.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden focusable="false" className={cn("size-9", className)}>
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <path
        className="fill-brand-on"
        d="M19.5 30.2V39.2c0 3.4 5.6 6 12.5 6s12.5-2.6 12.5-6V30.2L32 36.5Z"
      />
      <path
        className="fill-brand-on stroke-brand"
        strokeWidth="2.4"
        strokeLinejoin="round"
        paintOrder="stroke"
        d="M32 18.5L54 27L32 35.5L10 27Z"
      />
      <path
        className="fill-none stroke-brand-accent"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M32 27L51.5 28V38.5"
      />
      <path
        className="fill-brand-accent"
        fillRule="evenodd"
        d="M50.65 47.37L48.39 45.11A4.4 4.4 0 1 1 54.61 45.11L52.35 47.37A1.2 1.2 0 0 1 50.65 47.37ZM49.9 42a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0Z"
      />
    </svg>
  );
}
