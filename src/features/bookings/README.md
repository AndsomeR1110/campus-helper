# Bookings

Owner: **Member 3**. Unified My Bookings list and Booking Detail (office hour + study space).

- Pages: PG-06, PG-10

Structure and rules: [docs/frontend-architecture.md §4](../../../docs/frontend-architecture.md).

Public client exports: BookingItem, BookingList and BookingDetail.
Public server exports: createBookingsService and toSpaceBookingItem.
Sources must already be authenticated and owner-filtered on the server.
Office Hour wiring and real routes are deferred; see
[spaces/INTEGRATION.md](../spaces/INTEGRATION.md).
