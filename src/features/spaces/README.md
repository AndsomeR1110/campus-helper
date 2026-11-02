# Study spaces — Member 3

This PR contains only demo fixtures, URL filters and pure availability/booking rules
(FR-SP-01/02/03, SP-AC-01/02/05). No booking UI, routes or persistence.

Member 3 owns Space/SpaceBooking models, migrations, exclusion constraints, Prisma
adapter, routes and real PostgreSQL concurrency tests. Member 2 reviews schema
changes; Member 2 is not responsible for implementing this module.

Follow-up tasks: UI list/filter; transactional booking on database foundation #5;
unified bookings using Office Hour's public server API.
