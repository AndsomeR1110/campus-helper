# Bookings

Owner: **Member 3**. Unified My Bookings list and Booking Detail (office hour + study space).

- Pages: PG-06, PG-10

Structure and rules: [docs/frontend-architecture.md §4](../../../docs/frontend-architecture.md).

## Issue #27 integration status

PG-06 lists owner-scoped seat bookings and PG-10 shows their details. Cancellation
uses the shared ConfirmDialog and the spaces service's transactional cancellation;
records remain in history. IDs include `space-` / `office-` so source IDs cannot collide.
The source adapter accepts only the display fields needed by the client.

**This is not yet the complete OH-AC-08 / SP-AC-08 acceptance flow.**

- Main does not yet export `listMyBookings()` from `@/features/office-hours/server`
  (dependency #24). The Office Hour source is deliberately unavailable. The UI
  reports this explicitly, and Office Hour detail/cancellation returns an unavailable
  state / HTTP 503. No Office Hour tables are queried and no empty production
  result or fabricated shared interface is substituted.
- After Member 2 publishes the public service and DTO, bind its list and cancel
  functions in `server/runtime.ts`, adapting the confirmed DTO to the local
  `BookingRecord`. Unit fixtures for both sources verify the merge and dispatch,
  but are not evidence of real Office Hour integration.
- Auth #36 is merged. The runtime calls `getCurrentUser()` from `@/lib/auth`
  for each request and passes only its server-trusted ID and role to providers.
  Signed-out and inactive users are rejected before reading bookings. Seat
  cancellation also rechecks ownership and the allowed role inside its transaction.
- Home and Schedule consistency belongs to their integration work. This PR only
  covers the My Bookings side of OH-AC-08 / SP-AC-08 and must not auto-close #27.

No schema, shared UI, or dependencies are changed. `/bookings/[id]` already matches
the shared focused-route rule. Screenshots belong in the PR description, not `src/`.
