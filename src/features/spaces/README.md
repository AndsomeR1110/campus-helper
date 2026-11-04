# Study spaces — Member 3

Issue #26 connects PG-08 `/spaces`, PG-09 `/spaces/[id]` and the persistent booking
API to the existing rules, Prisma repository and handler factory.

## Run locally

Use Node >=22.12 and a local PostgreSQL database in DATABASE_URL:

1. `npm ci` and `npm run db:generate`
2. `npx prisma migrate deploy`
3. `npm run db:seed` (shared fictional users)
4. `node --experimental-strip-types src/features/spaces/seed-demo.mjs` (20 seats)
5. `npm run dev`, then open `/spaces`.

The seed command is idempotent; pages never seed or write while reading.

## Demo identity

Until auth-and-roles merges, issue #26 explicitly permits a server demo resolver.
`server/runtime.ts` selects only the active seeded student
`student.mia@campus-helper.demo`; it never accepts identity from request JSON,
query parameters or client headers. Missing/inactive/wrong-role users fail closed.
All visitors currently share that demo account; pages disclose this clearly.
This is not private authentication. Replace getCurrentSpaceActor with the real
`@/lib/auth` resolver as soon as that module lands.

## Behaviour

Filters live in the URL: date, start, end, building, floor, type. Defaults choose
a future 30-minute boundary in Asia/Shanghai, including around midnight.
Invalid query values stay visible with feedback. Availability is read live from
confirmed bookings for the selected interval.

The list has links to details and no sticky booking bar. Details use the existing
focused-route rule (already present in nav-config), loading skeleton, shared
TopBar/PageContainer/StickyActionBar and a confirmation dialog for cancellation.
Success waits for the server and refreshes persisted data; 409 preserves selection.
Offline submit actions are disabled. Loading, empty, invalid, missing and error
states are handled.

| API                                  | Meaning                                          |
| ------------------------------------ | ------------------------------------------------ |
| GET /api/space-bookings              | Current demo actor's seat bookings               |
| POST /api/space-bookings             | Strict JSON: spaceId, startsAt, endsAt (UTC ISO) |
| POST /api/space-bookings/[id]/cancel | Cancel an owned future confirmed booking         |

All responses use the shared API envelope and no-store. Browser cross-origin
mutations are rejected against the public Host (Next may use an internal URL).
Rules, ownership, roles and conflicts remain server-validated in the existing
service/transaction layer. Invalid input 400, no actor 401, forbidden 403,
invisible/missing booking 404, overlap/status conflict 409.

Unified My Bookings/Booking Detail is issue #27; Schedule is Member 4's module.
The GET API and existing toSpaceScheduleEvent remain their integration points.
See [INTEGRATION.md](INTEGRATION.md) for verification and remaining work.
