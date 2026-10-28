// Temporary landing page. Once auth lands (feat/auth-and-roles), `/` redirects
// to /home or /login — see docs/frontend-architecture.md §3.
export default function RootPage() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center gap-6 px-4 py-12 md:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-caption tracking-wide text-primary uppercase">Project setup</p>
        <h1 className="text-display">CAMPUS HELPER</h1>
        <p className="text-text-muted">Your campus, made simple.</p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        <li className="rounded-md border border-border bg-event-office-subtle p-4 text-subtitle text-event-office">
          Office Hour
        </li>
        <li className="rounded-md border border-border bg-event-space-subtle p-4 text-subtitle text-event-space">
          Study Space
        </li>
        <li className="rounded-md border border-border bg-event-class-subtle p-4 text-subtitle text-event-class">
          Class Reminder
        </li>
        <li className="rounded-md border border-border bg-lost-subtle p-4 text-subtitle text-lost">
          Lost &amp; Found
        </li>
      </ul>

      <p className="rounded-md bg-info-subtle p-4 text-body-sm text-info">
        CAMPUS HELPER is an academic project. Bookings are not recorded in any official university
        system.
      </p>
    </main>
  );
}
