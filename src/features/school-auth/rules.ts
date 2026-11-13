import type { SchoolAuthError, SchoolService } from "./types";

/** Limits from the university's own account form. */
export const ACCOUNT_MAX = 64;
export const PASSWORD_MAX = 100;

export interface CredentialIssues {
  account?: string;
  password?: string;
}

/**
 * Checks the fields like the school form does. The account is trimmed for the
 * empty check only; the password is never trimmed or altered, and no email
 * suffix is added.
 */
export function credentialIssues(account: string, password: string): CredentialIssues {
  const issues: CredentialIssues = {};
  if (!account.trim()) issues.account = "Enter your university account.";
  else if (account.length > ACCOUNT_MAX)
    issues.account = `Accounts are at most ${ACCOUNT_MAX} characters.`;
  if (!password) issues.password = "Enter your university password.";
  else if (password.length > PASSWORD_MAX)
    issues.password = `Passwords are at most ${PASSWORD_MAX} characters.`;
  return issues;
}

/** Verification image text: letters and digits, the length the school asks for. */
export function imageCodeIssue(code: string, length: number): string | null {
  const value = code.trim();
  if (!value) return "Enter the characters in the image.";
  if (!/^[A-Za-z0-9]+$/.test(value)) return "Use only the letters and numbers shown.";
  if (value.length !== length) return `Enter all ${length} characters.`;
  return null;
}

/**
 * Slider answer as a ratio of the displayed width, so screen scaling never
 * leaks into the school coordinates (native converts to source pixels).
 */
export function sliderRatio(offsetPx: number, trackPx: number) {
  if (trackPx <= 0 || !Number.isFinite(offsetPx)) return 0;
  return Math.min(1, Math.max(0, offsetPx / trackPx));
}

export const SERVICE_LABEL: Record<SchoolService, string> = {
  timetable: "School timetable",
  shuttle: "Shuttle bus",
};

export const SERVICE_CONTINUING: Record<SchoolService, string> = {
  timetable: "Fetching your timetable…",
  shuttle: "Opening shuttle booking…",
};

/** Plain-language copy for each failure; never invents school error details. */
export function errorCopy(error: SchoolAuthError): { title: string; text: string } {
  switch (error.kind) {
    case "account-switch":
      return {
        title: "Another app account is connected",
        text: "Disconnect the previous university session before connecting this account. Your saved courses will be kept.",
      };
    case "unavailable":
      return {
        title: "Android app update needed",
        text: "Open the current Android app with an up-to-date Android System WebView to connect your university account.",
      };
    case "rejected":
      return {
        title: "Sign-in not accepted",
        text:
          error.message ??
          "The university didn’t accept this account and password. Check them and try again.",
      };
    case "not-activated":
      return {
        title: "Activate your account first",
        text: "The university says this account isn’t activated yet. Activate it on the university website, then try again.",
      };
    case "challenge-expired":
      return {
        title: "Verification expired",
        text: "The verification step timed out. Start again to get a new one.",
      };
    case "unsupported-challenge":
      return {
        title: "Extra check needed",
        text: "The university asked for a check this screen can’t show. Continue on the university’s own sign-in page.",
      };
    case "session-expired":
      return {
        title: "Sign-in timed out",
        text: "The sign-in took too long and the university ended it. Start again.",
      };
    case "offline":
      return {
        title: "You’re offline",
        text: "Connect to the internet to sign in to your university account.",
      };
    default:
      return {
        title: "Couldn’t reach the university",
        text: "Check your connection and try again. Your saved data remains available.",
      };
  }
}
