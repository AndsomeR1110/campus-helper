import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.CAP_APP_URL ?? "http://localhost:3000";
const parsed = new URL(appUrl);
if (
  parsed.protocol !== "https:" &&
  !(parsed.protocol === "http:" && parsed.hostname === "localhost")
) {
  throw new Error("CAP_APP_URL must use HTTPS (localhost is allowed for Android development).");
}
const config: CapacitorConfig = {
  appId: "live.anran.campushelper",
  appName: "Campus Helper",
  webDir: "native/web",
  loggingBehavior: "none",
  server: { url: appUrl, cleartext: parsed.protocol === "http:" },
  android: { allowMixedContent: false },
};
export default config;
