# Study spaces — Member 3

Owner: **Member 3**. Member 2 reviews schema changes.

**In place:**

- Demo fixtures, URL filters and pure availability/booking rules (FR-SP-01/02/03, SP-AC-01/02/05).
- Seat selection UI: `SpacePicker` / `SpaceSelectionView`.
- Persistence: `Space` / `SpaceBooking` models, migrations, seat and student range exclusion
  constraints (SP-AC-04), Prisma repository, transactional booking/cancellation and API handler
  factories. See [INTEGRATION.md](INTEGRATION.md) for real PostgreSQL test commands.

**Still to do:** routes (once `feat/auth-and-roles` provides the session), seeding the demo seats
from `prisma/seed.ts`, and unified bookings using Office Hour's public server API.
