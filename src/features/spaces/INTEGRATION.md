# Member 3 integration status

This PR is a dependency-gated implementation, **not a working end-to-end booking system**.
The user explicitly limited changes to Member 3's modules after inspection found no
Prisma schema, database client, authentication or Office Hour service on main.
No production in-memory store, fake session, public mutation route or dependency upgrade is introduced.

## Implemented

- 20 fictional seat fixtures with campus/building/floor/type/facilities (FR-SP-01).
- URL date/time/building/floor/type parsing and combined filters (FR-SP-02).
- Interval-based availability, half-open overlap checks (FR-SP-03).
- Service factory with server session dependency, transactional create/cancel,
  conflict checks, ownership checks, retained cancellation history (FR-SP-04/05).
- UTC schedule DTO converter matching the **proposed** architecture §7.1 shape.
- Shared-component seat picker with demo notice, loading/empty/error handling,
  retained selection on failure; booking list/detail with cancellation dialog.

All production imports of services should use `@/features/spaces/server`, whose
`server-only` guard prevents client imports. Internal service factories and pure
rules deliberately remain testable without a Next.js runtime.

## Member 2: required before enabling routes

1. Confirm Space and SpaceBooking models and the SpaceRepository adapter in
   `server/service.ts`. Seed via DEMO_SPACES; do not persist an `available` flag.
2. Inject `currentActor` from the actual server session (`requireUser` or its
   confirmed equivalent). Never build Actor from request JSON, headers supplied
   by the browser, or URL parameters. Each query and mutation authenticates.
3. `transaction` must lock **both the student and the seat**, consistently across
   processes, before checking conflicts and inserting. Cancellation must use the
   same lock protocol and re-read the booking while locked. Transaction rollback
   must preserve the old state on failure. An in-process mutex is insufficient.
4. Prefer PostgreSQL `btree_gist` exclusion constraints over half-open
   `tstzrange(startsAt, endsAt, '[)')` for **both spaceId and userId**, conditional
   on status CONFIRMED, plus `endsAt > startsAt` and required foreign keys.
   Database constraint violations must become `BOOKING_CONFLICT` / HTTP 409;
   never leak database errors. Constraints/migrations belong to Member 2 review.
5. `findConflicts` must return confirmed overlaps for `(userId OR spaceId)`;
   `listForUser` must filter by session user ID in the database. Availability
   queries should retrieve only the columns needed for overlap checks.
6. Add zod request schemas (zod is not yet installed) and request handlers with
   `{ data }` / `{ error: { code, message } }`, server-side role checks, HTTP status
   mapping and the established application's CSRF/origin policy. No user ID or
   status in request bodies. Routes are intentionally absent until these exist.
7. Run real PostgreSQL concurrency tests from **independent connections**:
   same seat/different students, same student/different seats, cancellation racing
   with booking, back-to-back intervals, rollback and retry after a conflict.
   The included serialized repository test double only verifies orchestration;
   it does not prove database locking or satisfy SP-AC-04 end-to-end.

## Member 3: route composition after dependencies merge

- PG-08 `/spaces`: await searchParams under Suspense, parseSpaceFilters, authenticated
  service.search; pass the original query string and actual server results to
  SpacePicker. Optional empty filters mean all values. Remount filters on URL
  changes. Range errors must show validation feedback, never an empty success.
- PG-09 `/spaces/[id]`: authenticated seat detail with the same time picker.
- PG-06 `/bookings`: aggregate only authenticated, owner-filtered sources.
- PG-10 `/bookings/space-[id]` and `/bookings/office-[id]`: find only among the
  current user's records, return 404 for other users, route cancel by source type.
- On mutation success, refresh or navigate only after the server confirms;
  on 409 keep the selected seat/time and refresh availability. No optimistic success.
- Wrap request-time work in Suspense with Skeleton; add route error boundaries
  with ErrorState + retry and AppShell navigation once Member 1 supplies it.

## Members 2 and 4: shared interfaces

My Bookings' `listOfficeHours` dependency must call
`@/features/office-hours/server`, never its tables. It is intentionally required;
missing Office Hour data must not silently masquerade as an empty list.
`toSpaceScheduleEvent` exports a DTO only: Member 4 must confirm its shared type
and wire it into the real Schedule/Home aggregator. No shared interface file is
created or changed by this PR.

## Acceptance status

| AC       | Evidence in this PR                                  | Still needed                                        |
| -------- | ---------------------------------------------------- | --------------------------------------------------- |
| SP-AC-01 | Filter and URL parser unit tests                     | Authenticated route and browser flow                |
| SP-AC-02 | Interval availability and UI occupied-state tests    | Live database changes reflected in routes           |
| SP-AC-03 | Service creates session-owned confirmed record       | Persistent adapter and API                          |
| SP-AC-04 | Two concurrent calls, serialized **test double**     | PostgreSQL concurrency and API 409 test             |
| SP-AC-05 | Past/duration/alignment/window/user-overlap tests    | Request schemas and real session integration        |
| SP-AC-06 | Owner/start/status checks and retained cancelled row | Persistent cancellation and browser flow            |
| SP-AC-07 | Fictional fixtures and DemoDataNotice component test | Check notice on real PG-08/09 routes                |
| SP-AC-08 | Aggregation, detail and schedule DTO tests           | Office Hour service and actual Schedule integration |

No AC is claimed as fully accepted until its integration column passes.

## Verification and component previews

- `npm run check`: passed (45 tests including existing project tests).
- `npm run build`: passed after moving the failed restricted build cache aside
  and running with network/process permissions for the existing font/CSS build.
- Component preview screenshots (375 / 768 / 1280px) belong in the PR
  description rather than committed. They show isolated SpacePicker markup,
  not authenticated route/E2E screenshots; browser behavior and AppShell
  integration remain pending.
