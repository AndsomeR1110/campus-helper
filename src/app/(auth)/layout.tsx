import { Armchair, BellRing, CalendarClock, SearchCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AppLogo, CampusIllustration } from "@/components/ui";

const HIGHLIGHTS = [
  { icon: CalendarClock, text: "Book office hours with teaching staff" },
  { icon: Armchair, text: "Reserve a study seat in seconds" },
  { icon: BellRing, text: "Get reminded before every class" },
  { icon: SearchCheck, text: "Find what you lost on campus" },
];

/**
 * Sign in / register frame: campus-map hero beside a glass form card on
 * desktop, stacked on phones. Pages render their own heading and form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-12 lg:py-12">
      <section aria-label="About CAMPUS HELPER" className="flex flex-col gap-5 lg:gap-8">
        <div className="flex items-center gap-3">
          <AppLogo className="size-11 drop-shadow-sm" />
          <div className="flex flex-col">
            <span className="text-subtitle tracking-wide">CAMPUS HELPER</span>
            <span className="text-body-sm text-text-muted">Your campus, made simple.</span>
          </div>
        </div>
        <div className="relative hidden overflow-hidden rounded-lg sm:block">
          <CampusIllustration className="[mask-image:radial-gradient(closest-side,black_70%,transparent)]" />
        </div>
        <ul className="hidden flex-col gap-3 lg:flex">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-body text-text">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-subtle text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-6 rounded-lg border liquid-glass p-5 md:p-8">
        {children}
      </div>
    </main>
  );
}
