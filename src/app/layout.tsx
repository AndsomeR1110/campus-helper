import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ServiceWorkerRegistrar } from "@/components/pwa";
import { THEME_SCRIPT } from "@/components/theme";
import { Toaster } from "@/components/ui";
import { LOCALE_COOKIE } from "@/lib/i18n/messages";
import { LocaleBoundary } from "@/lib/i18n/server";
import "./globals.css";

// Self-hosted so builds work without access to Google Fonts (e.g. on the campus
// network). Inter variable font, Latin subset, SIL OFL — see fonts/Inter-OFL.txt.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CAMPUS HELPER",
    template: "%s · CAMPUS HELPER",
  },
  description:
    "Your campus, made simple. Office hours, study spaces, class reminders and lost & found in one place. An academic project — not an official university service.",
  applicationName: "CAMPUS HELPER",
  // iOS ignores the manifest for home-screen launches; these cover PWA-AC-02 there.
  appleWebApp: {
    capable: true,
    title: "Campus Helper",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1f8" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const LANGUAGE_SCRIPT = `if (document.cookie.split("; ").includes("${LOCALE_COOKIE}=zh-CN")) document.documentElement.lang = "zh-CN";`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme before first paint, so React must accept the DOM value.
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <LocaleBoundary>
            {children}
            <Toaster />
          </LocaleBoundary>
        </Suspense>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
