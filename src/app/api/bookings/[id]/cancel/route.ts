import { bookingsService, cancelBookingResponse } from "@/features/bookings/server";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return cancelBookingResponse(request, (await context.params).id, bookingsService);
}
