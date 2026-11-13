"use client";
import { useId, useState } from "react";
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  Button,
  FormField,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Spinner,
  useOffline,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_MAX,
  PASSWORD_MAX,
  SERVICE_CONTINUING,
  SERVICE_LABEL,
  credentialIssues,
  errorCopy,
  imageCodeIssue,
  sliderRatio,
  type CredentialIssues,
} from "../rules";
import type { SchoolAuthCommands, SchoolAuthError, SchoolAuthState, SchoolService } from "../types";

export interface SchoolSignInProps {
  open: boolean;
  service: SchoolService;
  state: SchoolAuthState;
  commands: SchoolAuthCommands;
  /** Closes the sheet (after cancel, failure or success). */
  onClose: () => void;
  /** Lets a preview force the offline state. */
  offlineOverride?: boolean;
}

type Phase = "account" | "verify" | "connect";
const phaseOf = (s: SchoolAuthState): Phase =>
  s.step === "image-challenge" || s.step === "slider-challenge" || s.step === "official-challenge"
    ? "verify"
    : s.step === "continuing" || s.step === "connected"
      ? "connect"
      : "account";

/**
 * School account sign-in in our own UI: account and password, a verification
 * step only when the university asks for one, then the hand-over to the
 * target service. Busy states block accidental dismissal; Cancel stays
 * available throughout.
 */
export function SchoolSignIn({
  open,
  service,
  state,
  commands,
  onClose,
  offlineOverride,
}: SchoolSignInProps) {
  const liveOffline = useOffline();
  const offline = offlineOverride ?? liveOffline;
  const busy =
    state.step === "preparing" ||
    state.step === "submitting" ||
    state.step === "continuing" ||
    (state.step === "official-challenge" && !!state.busy) ||
    ((state.step === "image-challenge" || state.step === "slider-challenge") && !!state.busy);
  const formId = useId();

  function cancel() {
    commands.cancel();
    onClose();
  }

  const footer = (() => {
    switch (state.step) {
      case "preparing":
      case "continuing":
        return <FooterButtons secondary={{ label: "Cancel", onClick: cancel }} />;
      case "credentials":
      case "submitting":
        return (
          <FooterButtons
            secondary={{ label: "Cancel", onClick: cancel }}
            primary={{
              label: "Sign in",
              form: formId,
              loading: state.step === "submitting",
              disabled: offline,
            }}
          />
        );
      case "image-challenge":
      case "slider-challenge":
        return (
          <FooterButtons
            secondary={{ label: "Cancel", onClick: cancel }}
            primary={{
              label: "Verify",
              form: formId,
              loading: state.busy,
              disabled: offline || state.error === "expired",
            }}
          />
        );
      case "official-challenge":
        return (
          <FooterButtons
            secondary={{ label: "Cancel", onClick: cancel }}
            primary={{
              label: "Complete university verification",
              onClick: commands.useOfficialSignIn,
              loading: state.busy,
              disabled: offline,
            }}
          />
        );
      case "connected":
        return <FooterButtons primary={{ label: "Done", onClick: onClose }} />;
      case "failed":
        if (state.error.kind === "account-switch")
          return (
            <FooterButtons
              secondary={{ label: "Close", onClick: cancel }}
              primary={{
                label: "Disconnect previous session",
                onClick: commands.disconnect,
                disabled: offline || !commands.disconnect,
              }}
            />
          );
        return state.error.kind === "unsupported-challenge" ? (
          <FooterButtons
            secondary={{ label: "Close", onClick: cancel }}
            primary={{
              label: "Continue on university page",
              onClick: commands.useOfficialSignIn,
              disabled: offline,
            }}
          />
        ) : (
          <FooterButtons
            secondary={{ label: "Close", onClick: cancel }}
            primary={{ label: "Start again", onClick: commands.retry, disabled: offline }}
          />
        );
      case "cancelled":
        return (
          <FooterButtons
            secondary={{ label: "Close", onClick: onClose }}
            primary={{ label: "Start again", onClick: commands.retry, disabled: offline }}
          />
        );
    }
  })();

  return (
    <Modal
      open={open}
      onClose={cancel}
      dismissible={!busy}
      title="Sign in to your university account"
      description={`For ${SERVICE_LABEL[service]} · not your Campus Helper login`}
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <Steps phase={phaseOf(state)} done={state.step === "connected"} />
        {offline && state.step !== "connected" && (
          <Notice tone="warning" icon={WifiOff}>
            You’re offline. Reconnect to continue. New submissions are paused.
          </Notice>
        )}
        <Body
          state={state}
          service={service}
          formId={formId}
          commands={commands}
          offline={offline}
        />
      </div>
    </Modal>
  );
}

function Body({
  state,
  service,
  formId,
  commands,
  offline,
}: {
  state: SchoolAuthState;
  service: SchoolService;
  formId: string;
  commands: SchoolAuthCommands;
  offline: boolean;
}) {
  switch (state.step) {
    case "official-challenge":
      return (
        <Notice tone="info" title="University verification required">
          Complete the university’s verification control to continue. Your account and password stay
          in this sign-in flow.
        </Notice>
      );
    case "preparing":
      return (
        <div role="status" className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-body-sm text-text-muted">
            <Spinner className="size-4" />
            Connecting to the university sign-in service…
          </p>
          <Skeleton className="h-11 rounded-sm" />
          <Skeleton className="h-11 rounded-sm" />
        </div>
      );
    case "credentials":
    case "submitting":
      return (
        <CredentialsForm
          // A new form after each rejection, so the password field starts empty.
          key={state.step === "credentials" ? (state.error?.kind ?? "fresh") : "submitting"}
          formId={formId}
          initialAccount={state.step === "credentials" ? (state.account ?? "") : ""}
          error={state.step === "credentials" ? state.error : undefined}
          submitting={state.step === "submitting"}
          offline={offline}
          onSubmit={commands.submitCredentials}
        />
      );
    case "image-challenge":
      return (
        <ImageChallenge
          key={state.image}
          formId={formId}
          state={state}
          offline={offline}
          commands={commands}
        />
      );
    case "slider-challenge":
      return (
        <SliderChallenge
          key={state.background}
          formId={formId}
          state={state}
          offline={offline}
          commands={commands}
        />
      );
    case "continuing":
      return (
        <div role="status" className="flex flex-col gap-3">
          <ProgressLine done text="Signed in to your university account" />
          <ProgressLine text={SERVICE_CONTINUING[service]} />
          <p className="text-caption text-text-muted">
            Keep this screen open. This can take a few seconds.
          </p>
        </div>
      );
    case "connected":
      return (
        <div role="status" className="flex flex-col gap-3">
          <ProgressLine done text="Signed in to your university account" />
          <ProgressLine
            done
            text={service === "timetable" ? "Timetable connection ready" : "Shuttle booking ready"}
          />
          {service === "timetable" && (
            <p className="text-body-sm text-text-muted">
              Your classes have been saved. The timetable page shows the new sync time.
            </p>
          )}
        </div>
      );
    case "failed": {
      const copy = errorCopy(state.error);
      return (
        <Notice
          tone={state.error.kind === "unsupported-challenge" ? "info" : "danger"}
          title={copy.title}
        >
          {copy.text}
        </Notice>
      );
    }
    case "cancelled":
      return (
        <Notice tone="neutral" title="Sign-in cancelled">
          Your password was cleared. Check the service page for the latest saved status.
        </Notice>
      );
  }
}

function CredentialsForm({
  formId,
  initialAccount,
  error,
  submitting,
  offline,
  onSubmit,
}: {
  formId: string;
  initialAccount: string;
  error?: SchoolAuthError;
  submitting: boolean;
  offline: boolean;
  onSubmit: SchoolAuthCommands["submitCredentials"];
}) {
  const [account, setAccount] = useState(initialAccount);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [issues, setIssues] = useState<CredentialIssues>({});
  const copy = error ? errorCopy(error) : null;

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting || offline) return;
        const found = credentialIssues(account, password);
        setIssues(found);
        if (found.account || found.password) return;
        try {
          onSubmit(account, password);
        } finally {
          // Clear even when a synchronous adapter validation error rejects submission.
          setPassword("");
          setVisible(false);
        }
      }}
    >
      {copy && (
        <Notice tone="danger" title={copy.title}>
          {copy.text}
        </Notice>
      )}
      <FormField
        label="University account"
        hint="The account you use for university systems."
        error={issues.account}
      >
        <Input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={ACCOUNT_MAX}
          value={account}
          disabled={submitting}
          onChange={(e) => setAccount(e.target.value)}
        />
      </FormField>
      <FormField label="University password" error={issues.password}>
        <div className="relative">
          <Input
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={PASSWORD_MAX}
            value={password}
            disabled={submitting}
            className="pr-12"
            onChange={(e) => setPassword(e.target.value)}
          />
          <IconButton
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute top-0 right-0 [&_svg]:size-5"
            disabled={submitting}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </IconButton>
        </div>
      </FormField>
      <p className="flex items-start gap-2 rounded-sm bg-surface-muted/60 px-3 py-2 text-body-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <span>
          Your password goes only to the university to sign you in. Campus Helper doesn’t store it
          or send it to its own servers.
        </span>
      </p>
      {submitting && (
        <p role="status" className="flex items-center gap-2 text-body-sm text-text-muted">
          <Spinner className="size-4" />
          Signing in…
        </p>
      )}
    </form>
  );
}

function ImageChallenge({
  formId,
  state,
  offline,
  commands,
}: {
  formId: string;
  state: Extract<SchoolAuthState, { step: "image-challenge" }>;
  offline: boolean;
  commands: SchoolAuthCommands;
}) {
  const [code, setCode] = useState("");
  const [issue, setIssue] = useState<string | null>(null);
  const expired = state.error === "expired";
  const error =
    issue ??
    (state.error === "wrong-code" ? "That didn’t match. Try the new image." : undefined) ??
    undefined;

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (state.busy || offline || expired) return;
        const found = imageCodeIssue(code, state.length);
        setIssue(found);
        if (!found) commands.submitImageCode(code.trim());
      }}
    >
      <Notice tone="info" title="Quick check">
        The university wants to confirm it’s you. Type the characters in the image.
      </Notice>
      <div className="flex items-center gap-3">
        {/* Verification images are device-local data URLs and never cached. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.image}
          alt="Verification characters"
          className={cn(
            "h-14 w-40 rounded-sm border border-border bg-white object-contain",
            expired && "opacity-40",
          )}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={state.busy || offline}
          onClick={() => {
            setCode("");
            setIssue(null);
            commands.refreshChallenge();
          }}
        >
          <RefreshCw className="size-4" aria-hidden />
          New image
        </Button>
      </div>
      {expired ? (
        <Notice tone="warning">This image expired. Get a new image to continue.</Notice>
      ) : (
        <FormField label="Characters in the image" error={error ?? undefined}>
          <Input
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={state.length}
            value={code}
            disabled={state.busy}
            className="w-40 text-title tracking-[0.4em]"
            onChange={(e) => {
              setCode(e.target.value);
              setIssue(null);
            }}
          />
        </FormField>
      )}
    </form>
  );
}

const STEPS = 1000;

function SliderChallenge({
  formId,
  state,
  offline,
  commands,
}: {
  formId: string;
  state: Extract<SchoolAuthState, { step: "slider-challenge" }>;
  offline: boolean;
  commands: SchoolAuthCommands;
}) {
  const [value, setValue] = useState(0);
  const expired = state.error === "expired";
  // Piece left edge as a share of the background width.
  const left = (value / STEPS) * (1 - state.pieceWidth);

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (state.busy || offline || expired) return;
        commands.submitSlider(sliderRatio(left * STEPS, STEPS));
      }}
    >
      <Notice tone="info" title="Quick check">
        Slide the piece into the gap in the picture, then verify.
      </Notice>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-sm border border-border",
          expired && "opacity-40",
        )}
      >
        {/* Challenge images are device-local data URLs and never cached. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.background} alt="" aria-hidden className="block w-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.piece}
          alt=""
          aria-hidden
          className="absolute drop-shadow"
          style={{
            left: `${left * 100}%`,
            top: `${state.pieceTop * 100}%`,
            width: `${state.pieceWidth * 100}%`,
          }}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Piece position</span>
        <input
          type="range"
          min={0}
          max={STEPS}
          step={5}
          value={value}
          disabled={state.busy || expired}
          aria-valuetext={`${Math.round((value / STEPS) * 100)}%`}
          className="h-11 w-full cursor-pointer accent-primary"
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </label>
      {state.error === "failed" && (
        <Notice tone="danger">That wasn’t quite right. Try the new puzzle.</Notice>
      )}
      {expired && <Notice tone="warning">This puzzle expired. Get a new one to continue.</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={state.busy || offline}
          onClick={() => {
            setValue(0);
            commands.refreshChallenge();
          }}
        >
          <RefreshCw className="size-4" aria-hidden />
          New puzzle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={state.busy || offline}
          onClick={commands.useOfficialSignIn}
        >
          Use the university’s sign-in page
        </Button>
      </div>
    </form>
  );
}

function Steps({ phase, done }: { phase: Phase; done: boolean }) {
  const order: Phase[] = ["account", "verify", "connect"];
  const labels: Record<Phase, string> = {
    account: "Account",
    verify: "Verify if asked",
    connect: "Connect",
  };
  const current = done ? order.length : order.indexOf(phase);
  return (
    <ol className="flex items-center gap-2 text-caption" aria-label="Sign-in steps">
      {order.map((p, i) => (
        <li key={p} className="flex min-w-0 items-center gap-2">
          <span
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 whitespace-nowrap",
              i < current && "bg-success-subtle text-success",
              i === current && "bg-primary-subtle text-primary",
              i > current && "bg-surface-muted text-text-muted",
            )}
          >
            {i < current && <Check className="size-3.5" aria-hidden />}
            {labels[p]}
          </span>
          {i < order.length - 1 && <span aria-hidden className="h-px w-3 bg-border-strong" />}
        </li>
      ))}
    </ol>
  );
}

function ProgressLine({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-body-sm">
      {done ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-success-subtle text-success">
          <Check className="size-3.5" aria-hidden />
        </span>
      ) : (
        <Spinner className="size-5" />
      )}
      {text}
    </p>
  );
}

const NOTICE = {
  info: { className: "bg-info-subtle text-info", Icon: Info },
  warning: { className: "bg-warning-subtle text-warning", Icon: CircleAlert },
  danger: { className: "bg-danger-subtle text-danger", Icon: CircleAlert },
  neutral: { className: "bg-neutral-subtle text-neutral", Icon: Info },
} as const;

function Notice({
  tone,
  title,
  icon,
  children,
}: {
  tone: keyof typeof NOTICE;
  title?: string;
  icon?: typeof Info;
  children: React.ReactNode;
}) {
  const { className, Icon: DefaultIcon } = NOTICE[tone];
  const Icon = icon ?? DefaultIcon;
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-sm px-3 py-3", className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <p className="text-body-sm font-semibold">{title}</p>}
        <p className="text-body-sm text-text">{children}</p>
      </div>
    </div>
  );
}

function FooterButtons({
  primary,
  secondary,
}: {
  primary?: {
    label: string;
    onClick?: () => void;
    form?: string;
    loading?: boolean;
    disabled?: boolean;
  };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <>
      {secondary && (
        <Button variant="secondary" fullWidth className="md:w-auto" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      )}
      {primary && (
        <Button
          fullWidth
          className="md:w-auto"
          type={primary.form ? "submit" : "button"}
          form={primary.form}
          loading={primary.loading}
          disabled={primary.disabled}
          onClick={primary.onClick}
        >
          {primary.label}
        </Button>
      )}
    </>
  );
}
