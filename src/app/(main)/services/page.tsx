import type { Metadata } from "next";
import Link from "next/link";
import { Bus } from "lucide-react";
import { PageContainer, SERVICES, TopBar } from "@/components/layout";
import { DemoDataNotice, cardStyles } from "@/components/ui";
import { ServiceTile } from "../_components/service-tile";
import { CampusGuide, ServiceTips } from "./campus-guide";

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
          <li>
            <Link
              href="/services/shuttle"
              className={cardStyles({
                variant: "widget",
                interactive: true,
                className: "flex h-full flex-col gap-3",
              })}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-accent-subtle text-accent">
                <Bus className="size-6" aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-subtitle">Shuttle bus</span>
                <span className="text-body-sm text-text-muted">
                  Book, board and manage campus trips
                </span>
              </span>
            </Link>
          </li>
        </ul>
        <ServiceTips />
        <CampusGuide />
        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}
