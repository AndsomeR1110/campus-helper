"use client";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog, useOffline } from "@/components/ui";
import {
  beginSchoolAuth,
  cancelSchoolAuth,
  completeSchoolConnection,
  disconnectSchoolAccount,
  onSchoolAuthActivity,
  onSchoolAuthEnd,
  refreshSchoolImage,
  showSchoolChallenge,
  submitSchoolCredentials,
  submitSchoolImageCode,
  resumeExistingSchoolConnection,
  type SchoolService,
} from "../bridge";
import { SchoolSignInSession, type ConnectionResult } from "../session";
import type { SchoolAuthCommands, SchoolAuthState } from "../types";
import { SchoolSignIn } from "./school-sign-in";

export function SchoolAccountSignIn({
  actorId,
  service,
  onClose,
  onConnected,
  resumeFirst = true,
}: {
  actorId: string;
  service: SchoolService;
  onClose: () => void;
  onConnected: (result: ConnectionResult) => void;
  resumeFirst?: boolean;
}) {
  const [state, setState] = useState<SchoolAuthState>({ step: "preparing" });
  const [confirm, setConfirm] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const hadInteraction = useRef(false);
  const session = useRef<SchoolSignInSession | null>(null);
  const callbacks = useRef({ onClose, onConnected });
  const offline = useOffline();
  useEffect(() => {
    callbacks.current = { onClose, onConnected };
  }, [onClose, onConnected]);
  useEffect(() => {
    const current = new SchoolSignInSession(
      actorId,
      service,
      {
        begin: beginSchoolAuth,
        credentials: submitSchoolCredentials,
        image: submitSchoolImageCode,
        refresh: refreshSchoolImage,
        official: showSchoolChallenge,
        cancel: cancelSchoolAuth,
        complete: completeSchoolConnection,
        disconnect: disconnectSchoolAccount,
        restore: resumeFirst ? resumeExistingSchoolConnection : undefined,
      },
      (next) => {
        if (next.step === "cancelled" && !hadInteraction.current) callbacks.current.onClose();
        else if (!["preparing", "continuing", "connected"].includes(next.step)) {
          hadInteraction.current = true;
          setInteractive(true);
        }
        setState(next);
      },
      (result) => {
        callbacks.current.onConnected(result);
        if (!hadInteraction.current) callbacks.current.onClose();
      },
    );
    session.current = current;
    let live = true;
    const hide = () => {
      if (document.hidden) current.cancel();
    };
    document.addEventListener("visibilitychange", hide);
    const listener = Promise.resolve()
      .then(() =>
        onSchoolAuthActivity(({ active }) => {
          if (live && !active) current.cancel();
        }),
      )
      .catch(() => null);
    const ended = Promise.resolve()
      .then(() =>
        onSchoolAuthEnd((event) => {
          if (live) current.operationEnded(event);
        }),
      )
      .catch(() => null);
    queueMicrotask(() => {
      if (!live) return;
      hadInteraction.current = false;
      setInteractive(false);
      if (navigator.onLine) void current.start();
      else {
        hadInteraction.current = true;
        setInteractive(true);
        setState({ step: "failed", error: { kind: "offline" } });
      }
    });
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", hide);
      void listener.then((handle) => handle?.remove()).catch(() => {});
      void ended.then((handle) => handle?.remove()).catch(() => {});
      current.dispose();
      if (session.current === current) session.current = null;
    };
  }, [actorId, service, resumeFirst]);
  const commands: SchoolAuthCommands = {
    submitCredentials: (account, password) => {
      if (!offline) void session.current?.submitCredentials(account, password);
    },
    submitImageCode: (code) => {
      if (!offline) void session.current?.submitImageCode(code);
    },
    refreshChallenge: () => {
      if (!offline) void session.current?.refreshImage();
    },
    // A custom puzzle is not emitted by the real adapter. It remains preview-only.
    submitSlider: () => setState({ step: "failed", error: { kind: "unsupported-challenge" } }),
    useOfficialSignIn: () => {
      if (!offline) void session.current?.showOfficial();
    },
    cancel: () => session.current?.cancel(),
    retry: () => {
      if (!offline) void session.current?.start();
    },
    disconnect: () => setConfirm(true),
  };
  return (
    <>
      <SchoolSignIn
        key={`${actorId}:${service}`}
        open={interactive && !confirm}
        service={service}
        state={state}
        commands={commands}
        onClose={onClose}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Disconnect the previous university session?"
        description="This clears the university session on this device. Saved courses and your Campus Helper login are kept."
        confirmLabel="Disconnect and sign in"
        onConfirm={async () => {
          if (offline) return;
          setConfirm(false);
          await session.current?.disconnectAndRetry();
        }}
      />
    </>
  );
}
