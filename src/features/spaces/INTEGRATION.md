# Member 3 — persistence integration

Member 3 implements Space/SpaceBooking models, migration, dual btree_gist
exclusion constraints, Prisma repository, schemas, service and API handler factory.
Member 2 reviews schema changes. Ownership is not delegated to Member 2.

This branch is based on database foundation #5, which is not yet on main.
Core rules/fixtures match #15. Do not merge this branch into main before #5 and
#15; after they merge retarget to main and resolve the expected overlapping core files.
UI is submitted separately in #16. No screenshots or unified bookings in this PR.

`createPrismaSpaceRepository(prisma)` is the persistent adapter. Call `seedSpaces`
from the seed composition when integrating fixtures. All new schema fields use
UTC timestamptz; confirmed bookings exclude overlapping spaceId AND userId.
Cancellation locks the owner-filtered row and updates status without deletion.
PostgreSQL SQLSTATE 23P01 is translated to a business 409 after transaction rollback.

`createSpaceHandlers(service)` uses src/lib/api.ts and strict zod input schemas.
It is not a public endpoint yet. The real auth-and-roles server resolver is not
present in #5 or main: route composition must inject that resolver before these
handlers are exported as app API routes. No fake authentication is introduced.
Office Hour / Schedule aggregation is a separate task after their server APIs land.

## Real database test

Use a disposable PostgreSQL database with btree_gist extension permission:

1. npm ci && npm run db:generate
2. DATABASE_URL=<disposable-url> npx prisma migrate deploy
3. TEST_DATABASE_URL=<same-disposable-url> npm test -- src/features/spaces/server/repository.postgres.test.ts

Tests opt in only via TEST_DATABASE_URL, create unique fictional fixtures, use two
independent Prisma clients, and clean only those fixtures. They prove actual seat
and student exclusions, persistence, cancellation/rebooking and adjacent intervals.
Normal npm run check skips these three tests unless the test URL is provided.

## Local verification

- npm run check: 48 passed, 3 real-database tests skipped without TEST_DATABASE_URL.
- npm run build: passed.
- Disposable PostgreSQL 18 with all five migrations applied: 3/3 database tests
  passed using two independent Prisma clients. No external database was used.
- Prisma format/generate passed; no dependency additions to this branch.
