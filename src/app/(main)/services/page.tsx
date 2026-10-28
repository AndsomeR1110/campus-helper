import type { Metadata } from "next";
import { PageContainer, SERVICES, TopBar } from "@/components/layout";
import { DemoDataNotice } from "@/components/ui";
import { ServiceTile } from "../_components/service-tile";

export const metadata: Metadata = { title: "Services" };

// PG-03
export default function ServicesPage() {
  return (
    <>
      <TopBar title="Services" variant="large" />
      <PageContainer>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <li key={service.href}>
              <ServiceTile service={service} />
            </li>
          ))}
        </ul>
        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}
