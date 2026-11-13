/**
 * Presentation contract adapted to the native facade by session.ts.
 * The custom slider below remains development-preview only; real sliders
 * use official-challenge, without exposing the school's challenge tokens.
 *
 * Codex owns the Android authentication runtime: policy, RSA encryption,
 * challenges, redirects and the hand-over to the timetable or shuttle
 * session. The UI only renders these states and sends these commands. The
 * native side returns bounded DTOs and an opaque per-operation handle; never
 * cookies, tickets, keys or redirect URLs.
 */

/** Which service the sign-in continues into. */
export type SchoolService = "timetable" | "shuttle";

export type SchoolAuthError =
  /** The university did not accept the account or password. */
  | { kind: "rejected"; message?: string }
  /** The account must be activated on the university website first (SSO10121). */
  | { kind: "not-activated" }
  /** The verification image or puzzle expired before it was used. */
  | { kind: "challenge-expired" }
  /** The university asked for a check the app can't show here. */
  | { kind: "unsupported-challenge" }
  /** The sign-in took too long or the school session ended. */
  | { kind: "session-expired" }
  | { kind: "network" }
  | { kind: "offline" }
  | { kind: "account-switch" }
  | { kind: "unavailable" };

export type SchoolAuthState =
  | { step: "preparing" }
  | { step: "credentials"; account?: string; error?: SchoolAuthError }
  | { step: "submitting" }
  | { step: "official-challenge"; busy?: boolean }
  | {
      step: "image-challenge";
      /** data: URL rendered in memory only. */
      image: string;
      /** Expected characters; the current school form uses 4. */
      length: number;
      error?: "wrong-code" | "expired";
      busy?: boolean;
    }
  | {
      step: "slider-challenge";
      /** data: URLs for the background with its gap and the movable piece. */
      background: string;
      piece: string;
      /** Piece top as a fraction of the background height (0–1). */
      pieceTop: number;
      /** Piece width as a fraction of the background width (0–1). */
      pieceWidth: number;
      error?: "failed" | "expired";
      busy?: boolean;
    }
  | { step: "continuing"; service: SchoolService }
  | { step: "connected"; service: SchoolService }
  | { step: "failed"; error: SchoolAuthError }
  | { step: "cancelled" };

/** Commands the UI sends; the native side answers with the next state. */
export interface SchoolAuthCommands {
  /** The password is handed over once and not kept by the UI. */
  submitCredentials: (account: string, password: string) => void;
  submitImageCode: (code: string) => void;
  /**
   * Development-preview command only. Real sliders use useOfficialSignIn;
   * the production adapter does not accept or simulate a slider answer.
   */
  submitSlider: (offsetRatio: number) => void;
  refreshChallenge: () => void;
  /** Hand the challenge to the university's own sign-in screen. */
  useOfficialSignIn: () => void;
  /** Cancels the in-flight operation; also called on account switch. */
  cancel: () => void;
  retry: () => void;
  disconnect?: () => void;
}
