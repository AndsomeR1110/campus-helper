import type { Metadata } from "next";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

/** Internal reference page for the shared UI components. Not linked from the app. */
export default function DesignSystemPage() {
  return <Showcase />;
}
