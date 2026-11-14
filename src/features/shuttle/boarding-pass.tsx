"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CircleAlert, EyeOff, Info, RefreshCw } from "lucide-react";
import { Button, Modal, Spinner } from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";
import { shuttle, shuttleError } from "./bridge";
import type { Trip } from "./schemas";
import { campusShort, journeyEnd, journeyStart } from "./view-model";

/** What the pass screen is showing; the lifecycle below decides it. */
type PassStatus =
  | { kind: "loading" }
  | { kind: "live" }
  | { kind: "expired" }
  | { kind: "changed" }
  | { kind: "error"; text: string };

export function BoardingPass({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<PassStatus>({ kind: "loading" });
  const [active, setActive] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let removed = false;
    const listener = shuttle.onState(({ active }) => {
      if (!removed) {
        setActive(active);
        if (!active) setImage("");
      }
    });
    return () => {
      removed = true;
      void listener.then((l) => l.remove());
    };
  }, []);
  useEffect(() => {
    let cancelled = false,
      statusChanged = false,
      refreshTimer: ReturnType<typeof setTimeout>,
      expiryTimer: ReturnType<typeof setTimeout>,
      scanTimer: ReturnType<typeof setTimeout>;
    const clear = () => {
      clearTimeout(refreshTimer);
      clearTimeout(expiryTimer);
      clearTimeout(scanTimer);
      setImage("");
    };
    async function refresh() {
      if (cancelled || statusChanged || document.hidden || !active) return;
      let delay = 3000;
      const started = performance.now();
      try {
        const pass = await shuttle.pass(trip);
        const src = await QRCode.toDataURL(pass.payload, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        const lifetime = pass.validForMs - (performance.now() - started);
        if (cancelled || statusChanged || document.hidden || !active) return;
        delay = Math.min(6000, Math.max(1000, lifetime - 1500));
        clearTimeout(expiryTimer);
        setImage(lifetime > 0 ? src : "");
        setStatus({ kind: lifetime > 0 ? "live" : "expired" });
        expiryTimer = setTimeout(
          () => {
            setImage("");
            setStatus({ kind: "expired" });
          },
          Math.max(0, lifetime),
        );
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "BUSY") {
          delay = 1000;
        } else if (!cancelled && !statusChanged) {
          setImage("");
          setStatus({ kind: "error", text: shuttleError(error) });
        }
      }
      if (!cancelled && !statusChanged) refreshTimer = setTimeout(refresh, delay);
    }
    async function scan() {
      if (cancelled || document.hidden || !active) return;
      try {
        const result = await shuttle.scan(trip);
        if (
          result &&
          typeof result === "object" &&
          "status" in result &&
          result.status === "changed"
        ) {
          if (!cancelled) {
            statusChanged = true;
            clear();
            setStatus({ kind: "changed" });
          }
          return;
        }
      } catch {
        /* A pending refresh can temporarily occupy the single request channel. */
      }
      if (!cancelled) scanTimer = setTimeout(scan, 3000);
    }
    const visibility = () => {
      clear();
      if (!document.hidden && active) {
        void refresh();
        scanTimer = setTimeout(scan, 3000);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    if (active) {
      void refresh();
      scanTimer = setTimeout(scan, 3000);
    }
    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      clearTimeout(expiryTimer);
      clearTimeout(scanTimer);
      document.removeEventListener("visibilitychange", visibility);
      void shuttle.closePass();
    };
  }, [trip, retry, active]);
  const shown = Boolean(image && active && status.kind === "live");
  return (
    <Modal
      open
      onClose={onClose}
      title="Boarding pass"
      description={`${formatDate(`${trip.date}T12:00:00+08:00`)}, ${formatTimeRange(
        journeyStart(trip),
        journeyEnd(trip),
      )} · ${campusShort(trip.from)} → ${campusShort(trip.to)}`}
      footer={
        <Button variant="secondary" fullWidth className="md:w-auto" onClick={onClose}>
          Close boarding pass
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Scanners need dark modules on white in both themes. */}
        <div className="relative flex size-68 items-center justify-center rounded-lg border border-border bg-white p-3 shadow-card">
          {shown ? (
            // QR codes are short-lived device-local data URLs, never optimized or cached.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              width={256}
              height={256}
              alt="Your live shuttle boarding QR code"
              className="size-full"
            />
          ) : (
            <PassPlaceholder status={status} active={active} />
          )}
        </div>
        <PassStatusLine status={status} active={active} shown={shown} />
        {(status.kind === "error" || status.kind === "expired") && active && (
          <Button variant="secondary" size="sm" onClick={() => setRetry((n) => n + 1)}>
            <RefreshCw className="size-4" aria-hidden />
            Get a new code
          </Button>
        )}
        <p className="text-center text-caption text-text-muted">
          Show this code to the driver. It refreshes automatically and is hidden when it expires or
          when you leave the app.
        </p>
      </div>
    </Modal>
  );
}

function PassPlaceholder({ status, active }: { status: PassStatus; active: boolean }) {
  const Icon = !active
    ? EyeOff
    : status.kind === "changed"
      ? Info
      : status.kind === "error"
        ? CircleAlert
        : null;
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 rounded-sm bg-surface-muted text-text-muted">
      {Icon ? <Icon className="size-8" aria-hidden /> : <Spinner />}
      <span className="px-6 text-center text-body-sm">
        {!active
          ? "Hidden while the app is in the background"
          : status.kind === "changed"
            ? "Pass closed"
            : status.kind === "error"
              ? "Code unavailable"
              : status.kind === "expired"
                ? "Getting a new code…"
                : "Getting your live code…"}
      </span>
    </div>
  );
}

function PassStatusLine({
  status,
  active,
  shown,
}: {
  status: PassStatus;
  active: boolean;
  shown: boolean;
}) {
  const [tone, text] = !active
    ? (["neutral", "Return to the app to get a fresh boarding pass."] as const)
    : shown
      ? (["success", "Live · refreshes automatically"] as const)
      : status.kind === "changed"
        ? ([
            "info",
            "The school updated this trip’s boarding status. Close the pass to refresh My trips.",
          ] as const)
        : status.kind === "error"
          ? (["warning", status.text] as const)
          : status.kind === "expired"
            ? (["neutral", "This code expired. A new one is on its way."] as const)
            : (["neutral", "Getting your live boarding pass…"] as const);
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-center text-body-sm",
        tone === "success" && "bg-success-subtle text-success",
        tone === "info" && "bg-info-subtle text-info",
        tone === "warning" && "bg-warning-subtle text-warning",
        tone === "neutral" && "text-text-muted",
      )}
    >
      {tone === "success" && (
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />
      )}
      {text}
    </p>
  );
}
