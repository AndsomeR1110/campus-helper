import type { Metadata } from "next";
import { PageContainer, TopBar } from "@/components/layout";
import { RoomsNotConnected } from "@/features/school-rooms";

export const metadata: Metadata = { title: "Discussion rooms" };

/** Real route: honest status until the school adapter and facade land (Codex). */
export default function RoomsPage() {
  return (
    <>
      <TopBar title="Discussion rooms" backHref="/services" />
      <PageContainer>
        <RoomsNotConnected />
      </PageContainer>
    </>
  );
}
