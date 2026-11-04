"use client";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui";
export function UnavailableBooking() {
  const router = useRouter();
  return (
    <ErrorState
      title="Office Hour bookings are unavailable"
      description="The Office Hour service has not been connected yet or could not be loaded. Please try again later."
      onRetry={() => router.refresh()}
    />
  );
}
