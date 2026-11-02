"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

/** Chromium's install prompt event (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this instead of the display-mode media query.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "Install app" entry on Profile (US-501, PWA-AC-01). Shows the browser's
 * install prompt where supported (Chromium), Add to Home Screen steps on iOS,
 * and nothing when the app is already installed or installation isn't possible.
 */
export function InstallAppCard() {
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => true);
  const ios = useSyncExternalStore(
    () => () => {},
    isIos,
    () => false,
  );
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || (!promptEvent && !ios)) return null;

  return (
    <section
      aria-labelledby="install-app-title"
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <Download className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="install-app-title" className="text-subtitle">
            Install the app
          </h2>
          <p className="text-body-sm text-text-muted">
            Open CAMPUS HELPER from your home screen, full screen.
          </p>
        </div>
      </div>
      {promptEvent ? (
        <Button
          variant="secondary"
          onClick={async () => {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            setPromptEvent(null);
          }}
        >
          Install app
        </Button>
      ) : (
        <p className="text-body-sm text-text">
          In Safari, tap <Share className="inline size-4 align-text-bottom" aria-label="Share" />{" "}
          then <span className="font-medium">Add to Home Screen</span>.
        </p>
      )}
    </section>
  );
}
