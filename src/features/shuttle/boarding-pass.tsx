"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, Modal, Spinner } from "@/components/ui";
import { shuttle, shuttleError } from "./bridge";
import type { Trip } from "./schemas";

export function BoardingPass({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
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
        setMessage(
          lifetime > 0
            ? "Refreshes automatically while this screen is open."
            : "This code expired. Getting a new one…",
        );
        expiryTimer = setTimeout(
          () => {
            setImage("");
            setMessage("Code expired. Reconnecting…");
          },
          Math.max(0, lifetime),
        );
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "BUSY") {
          delay = 1000;
        } else if (!cancelled && !statusChanged) {
          setImage("");
          setMessage(shuttleError(error));
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
            setMessage("The school boarding status changed. Close this pass and refresh My trips.");
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
  return (
    <Modal
      open
      onClose={onClose}
      title="Boarding pass"
      description={`${trip.from} → ${trip.to} · ${trip.departure}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close boarding pass
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4">
        {image && active ? (
          // QR codes are short-lived device-local data URLs, never optimized or cached.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            width={256}
            height={256}
            alt="Your live shuttle boarding QR code"
            className="rounded-sm bg-surface"
          />
        ) : (
          <div className="flex size-64 items-center justify-center rounded-sm bg-surface-muted">
            <Spinner />
          </div>
        )}
        <p role="status" className="text-center text-body-sm text-text-muted">
          {active
            ? message || "Getting your live boarding pass…"
            : "Return to the app to get a fresh boarding pass."}
        </p>
        <Button variant="secondary" onClick={() => setRetry((n) => n + 1)}>
          Refresh boarding pass
        </Button>
        <p className="text-center text-caption text-text-muted">
          Show this code on the bus. Expired codes are hidden automatically.
        </p>
      </div>
    </Modal>
  );
}
