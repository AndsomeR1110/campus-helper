"use client";
import { useTranslations } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui";
export function UnavailableBooking() {
  const t = useTranslations();
  const router = useRouter();
  return (
    <ErrorState
      title={t("Office Hour bookings are unavailable")}
      description={t(
        "The Office Hour service has not been connected yet or could not be loaded. Please try again later.",
      )}
      onRetry={() => router.refresh()}
    />
  );
}
