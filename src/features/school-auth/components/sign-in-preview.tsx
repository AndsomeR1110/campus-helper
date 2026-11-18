"use client";
/**
 * DEVELOPMENT PREVIEW of the school sign-in sheet. A scripted stand-in for
 * the native authentication runtime (Codex) with fictional images; nothing
 * is sent anywhere and no password is read beyond the form.
 */
import { useRef, useState } from "react";
import { CalendarSync, Bus } from "lucide-react";
import { Button, Card, Chip, ChipGroup } from "@/components/ui";
import { PREVIEW_GAP, PREVIEW_IMAGE_CODE, previewImage, previewPuzzle } from "../preview-data";
import type { SchoolAuthCommands, SchoolAuthError, SchoolAuthState, SchoolService } from "../types";
import { SchoolSignIn } from "./school-sign-in";

type Scenario =
  | "connected"
  | "image"
  | "slider"
  | "rejected"
  | "not-activated"
  | "unsupported"
  | "network"
  | "session-expired";

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "connected", label: "Signs in" },
  { id: "image", label: "Image check" },
  { id: "slider", label: "Puzzle check" },
  { id: "rejected", label: "Rejected" },
  { id: "not-activated", label: "Not activated" },
  { id: "unsupported", label: "Unsupported check" },
  { id: "network", label: "Network error" },
  { id: "session-expired", label: "Timed out" },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SignInPreview() {
  const [service, setService] = useState<SchoolService>("timetable");
  const [scenario, setScenario] = useState<Scenario>("connected");
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SchoolAuthState>({ step: "preparing" });
  // Each operation gets a token so a cancelled run can't update the sheet.
  const run = useRef(0);
  const account = useRef("");

  async function step(token: number, next: SchoolAuthState, ms = 700) {
    await wait(ms);
    if (run.current === token) setState(next);
  }

  function start() {
    const token = ++run.current;
    setState({ step: "preparing" });
    void step(token, { step: "credentials", account: account.current }, 600);
  }

  async function continueService(token: number) {
    await step(token, { step: "continuing", service }, 600);
    await step(token, { step: "connected", service }, 1400);
  }

  function failWith(error: SchoolAuthError): SchoolAuthState {
    return error.kind === "rejected"
      ? { step: "credentials", account: account.current, error }
      : { step: "failed", error };
  }

  const image = (error?: "wrong-code" | "expired"): SchoolAuthState => ({
    step: "image-challenge",
    image: previewImage(),
    length: PREVIEW_IMAGE_CODE.length,
    error,
  });
  const puzzle = (error?: "failed" | "expired"): SchoolAuthState => ({
    step: "slider-challenge",
    ...previewPuzzle(),
    error,
  });

  const commands: SchoolAuthCommands = {
    submitCredentials(acc) {
      account.current = acc;
      const token = run.current;
      setState({ step: "submitting" });
      const next: Record<Scenario, () => void> = {
        connected: () => void continueService(token),
        image: () => void step(token, image()),
        slider: () => void step(token, puzzle()),
        rejected: () => void step(token, failWith({ kind: "rejected" })),
        "not-activated": () => void step(token, failWith({ kind: "not-activated" })),
        unsupported: () => void step(token, failWith({ kind: "unsupported-challenge" })),
        network: () => void step(token, failWith({ kind: "network" })),
        "session-expired": () => void step(token, failWith({ kind: "session-expired" })),
      };
      next[scenario]();
    },
    submitImageCode(code) {
      const token = run.current;
      setState((s) => (s.step === "image-challenge" ? { ...s, busy: true } : s));
      if (code.toUpperCase() === PREVIEW_IMAGE_CODE) void continueService(token);
      else void step(token, image("wrong-code"));
    },
    submitSlider(ratio) {
      const token = run.current;
      setState((s) => (s.step === "slider-challenge" ? { ...s, busy: true } : s));
      if (Math.abs(ratio - PREVIEW_GAP) <= 0.03) void continueService(token);
      else void step(token, puzzle("failed"));
    },
    refreshChallenge() {
      setState((s) =>
        s.step === "image-challenge" ? image() : s.step === "slider-challenge" ? puzzle() : s,
      );
    },
    useOfficialSignIn() {
      // Real mode hands over to the university's own screen; the preview just finishes.
      void continueService(run.current);
    },
    cancel() {
      run.current++;
      setState({ step: "cancelled" });
    },
    retry: start,
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h2 className="text-caption tracking-wide text-text-muted uppercase">Preview controls</h2>
        <Control label="Connecting for">
          <Chip selected={service === "timetable"} onClick={() => setService("timetable")}>
            School timetable
          </Chip>
          <Chip selected={service === "shuttle"} onClick={() => setService("shuttle")}>
            Shuttle bus
          </Chip>
        </Control>
        <Control label="After Sign in">
          {SCENARIOS.map((s) => (
            <Chip key={s.id} selected={scenario === s.id} onClick={() => setScenario(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Control>
        <Control label="Network">
          <Chip selected={!offline} onClick={() => setOffline(false)}>
            Online
          </Chip>
          <Chip selected={offline} onClick={() => setOffline(true)}>
            Offline
          </Chip>
        </Control>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setState((s) =>
                s.step === "image-challenge" || s.step === "slider-challenge"
                  ? { ...s, error: "expired" }
                  : s,
              )
            }
          >
            Expire current check
          </Button>
        </div>
        <p className="text-caption text-text-muted">
          Fictional answers: image <strong>{PREVIEW_IMAGE_CODE}</strong>, puzzle gap near{" "}
          {Math.round(PREVIEW_GAP * 100)}%. Any account and password work; nothing is sent.
        </p>
      </Card>

      <Card variant="widget" className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-md bg-event-class-subtle text-event-class">
          {service === "timetable" ? (
            <CalendarSync className="size-6" aria-hidden />
          ) : (
            <Bus className="size-6" aria-hidden />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-title">
            {service === "timetable" ? "School timetable" : "Shuttle bus"}
          </h2>
          <p className="text-body-sm text-text-muted">
            Stand-in for the page that starts a school connection.
          </p>
        </div>
        <Button
          onClick={() => {
            setOpen(true);
            start();
          }}
        >
          Connect school account
        </Button>
      </Card>

      <SchoolSignIn
        open={open}
        service={service}
        state={state}
        commands={commands}
        offlineOverride={offline}
        onClose={() => {
          run.current++;
          setOpen(false);
        }}
      />
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-body-sm font-medium" aria-hidden>
        {label}
      </span>
      <ChipGroup label={label}>{children}</ChipGroup>
    </div>
  );
}
