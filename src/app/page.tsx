import { redirect } from "next/navigation";

// Signed-out users will be sent to /login by src/proxy.ts once auth lands
// (feat/auth-and-roles). See docs/frontend-architecture.md §3.
export default function RootPage() {
  redirect("/home");
}
