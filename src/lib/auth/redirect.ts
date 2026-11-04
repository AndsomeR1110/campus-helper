/**
 * Where to send the user after signing in / out.
 *
 * Only same-site paths are allowed. `startsWith("/") && !startsWith("//")` is
 * not enough: browsers treat "\" like "/", so "/\evil.com" (or "/%5Cevil.com"
 * once decoded) would leave the site — an open redirect usable for phishing.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Backslashes and control characters (tabs/newlines are stripped by URL parsers).
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://campus-helper.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
