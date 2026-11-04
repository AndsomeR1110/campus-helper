# Member 3 — pages and booking API integration

The database, rules and shared layout are now on main. Issue #26 connects the
space list/detail routes and API without mixing in issue #27 (unified bookings).

## Acceptance evidence

| Criterion | Verification                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| SP-AC-01  | Real list URL with East/floor 2/Quiet returns exactly 3 seats; filter links survive navigation                                                   |
| SP-AC-02  | Browser booking persists after reload and changes the list's live availability                                                                   |
| SP-AC-03  | Browser submits a valid booking and sees Confirmed only after HTTP 201                                                                           |
| SP-AC-04  | Existing 3 real-PostgreSQL tests pass; real API race returns one 201 and one 409                                                                 |
| SP-AC-05  | Past/invalid query feedback, server invalid interval 400 and strict identity injection rejection                                                 |
| SP-AC-06  | Confirmation dialog cancels in the database, retains history and restores availability                                                           |
| SP-AC-07  | Both real routes show demo data and shared demo-account notices                                                                                  |
| SP-AC-08  | Current seat's records and GET API persist correctly; unified `/bookings` is issue #27; Schedule UI remains M4's task, not claimed complete here |

## Verification performed

- `npm run check`: 188 tests passed; 3 PostgreSQL tests skipped without the opt-in URL.
- `npm run build`: passed on the latest main base.
- Separate isolated PostgreSQL 18 run: all six migrations and shared/user/seat
  seeds applied; 3/3 existing database tests passed using independent connections.
- Headless browser against the real production server: filters, list-to-detail,
  booking, reload persistence, cancellation, 201/409 race, 400/403 validation,
  foreign-record cancellation/list filtering, inactive demo actor 401,
  personal no-store responses, past input retention and unknown-seat not-found.
- List/detail measured and captured at 375/768/1280px; no horizontal overflow.
  Screenshots are outside the source tree, for PR attachments.
- Tests use only a disposable local database; the app/database processes stop
  after verification. No project dependencies, shared UI, auth or schema changed.

## Reproduce database tests

Use an isolated PostgreSQL database with btree_gist extension permission:

1. `npm ci && npm run db:generate`
2. `DATABASE_URL=<disposable-url> npx prisma migrate deploy`
3. `TEST_DATABASE_URL=<same-url> npm test -- src/features/spaces/server/repository.postgres.test.ts`

The tests opt in only via TEST_DATABASE_URL, create uniquely named fictional
fixtures and clean only their fixtures. Normal check skips them without this URL.

## Remaining integration

- Replace the explicitly permitted demo actor in server/runtime.ts with
  `@/lib/auth` once auth-and-roles lands. Until then all visitors share Mia's demo
  bookings; the account is never selected by the browser and no privacy claim is made.
- Issue #27 consumes Office Hour through its public server API and unifies
  bookings. Member 4 consumes seat schedule DTOs for Schedule. Neither module is
  changed by this route-focused PR.
- The `/spaces/[id]` focused pattern and navigation tests already exist; no
  duplicate or unrelated change to Member 1's nav-config is needed.
