"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, toast } from "@/components/ui";

/** Chrome/Edge expose the Push API only in a service-worker scope. */
function isSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }

  return bytes;
}

/**
 * Enables browser notifications (task #30, FR-PWA-03).
 *
 * Permission is requested **only after the user presses the button** 鈥?never on
 * page load. If they decline, in-app notifications keep working, so the copy
 * says so instead of nagging.
 */
export function EnablePushButton() {
  const [state, setState] = useState<"idle" | "unsupported" | "denied" | "enabled" | "pending">(
    "idle",
  );

  useEffect(() => {
    if (!isSupported()) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
    } else if (Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setState(subscription ? "enabled" : "idle"))
        .catch(() => setState("idle"));
    }
  }, []);

  async function handleEnable() {
    setState("pending");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        toast.info("Notifications stay off. You will still see them in the app.");
        return;
      }

      const keyResponse = await fetch("/api/push/subscribe");
      if (!keyResponse.ok) {
        throw new Error("Push is not configured on this server.");
      }
      const { data } = (await keyResponse.json()) as { data: { publicKey: string } };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save this device.");
      }

      setState("enabled");
      toast.success("Notifications enabled on this device");
    } catch (error) {
      setState("idle");
      toast.error(error instanceof Error ? error.message : "Could not enable notifications.");
    }
  }

  if (state === "unsupported") {
    return <p className="text-body-sm text-text-muted">This browser does not support push.</p>;
  }

  if (state === "enabled") {
    return <p className="text-body-sm text-text-muted">Notifications are on for this device.</p>;
  }

  if (state === "denied") {
    return (
      <p className="text-body-sm text-text-muted">
        Notifications are blocked in your browser settings. In-app reminders still work.
      </p>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleEnable}
      loading={state === "pending"}
    >
      <BellRing className="size-4" aria-hidden />
      Enable notifications
    </Button>
  );
}

