import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui";
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
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
