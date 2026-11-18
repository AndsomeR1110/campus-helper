# Shuttle Android integration

This extension is isolated in `src/features/shuttle` and the Android `Shuttle` plugin. It implements the user's additional shuttle requirement; the existing PRD has no shuttle requirement IDs. Local acceptance IDs SH-AC-01/02 cover school response boundaries and confirmed mutations.

The Campus Helper interface calls a fixed native operation set. A separate Android WebView maintains the university SSO session and makes same-origin school requests. Only the login window shows the school page. Cookies, CSRF tokens and verification tickets never cross the bridge. No backend proxy, account database changes or copied desktop sessions are used.

## Build and run

Use Node 22.12+, Java 21 and Android SDK 36. Set JAVA_HOME and ANDROID_HOME. Run `npm ci`, configure the existing app environment, and run `npm run dev`. Set CAP_APP_URL to the trusted HTTPS Campus Helper deployment before a release build. The default localhost URL is for debug only.

Run `npm run native:android`. The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. For emulator development, run `adb reverse tcp:3000 tcp:3000`, install the APK and open Campus Helper. Sign in to Campus Helper, open Services > Shuttle bus, and connect the school account. Complete university SSO inside the protected window, then tap Done. The university session belongs to the app WebView.

The release manifest rejects HTTP. Debug HTTP is restricted to localhost; school TLS validation is never disabled. The native bridge checks the main app's exact configured origin, validates operations and allows only the exact school origin to return results. Login navigations allow the school, uim and trust hosts. Booking and cancellation require explicit confirmation, revalidate ownership and never automatically retry writes. Unknown results require refreshing My trips.

## Boarding pass

The adapter parses the official QR string without evaluating school scripts. The app renders it locally, refreshes it periodically, polls the school's verification endpoint, hides expired codes and requests a fresh code after foregrounding. Lifetime uses elapsed monotonic time and the response server date rather than the device clock. QR data stays in memory. The native window disables screenshots while displaying a pass and protects login screenshots. A changed verification response is reported as a status change, not proof of boarding.

## Validation status (2026-11-13)

- Android debug APK built and installed on MuMu Android 15.
- The actual app loads the Campus Helper shuttle UI through the Android bridge and opens its internal school connection dialog.
- Independent desktop browser investigation previously verified same-origin booking and cancellation, with test reservations removed. That evidence is not an Android end-to-end pass.
- MuMu authenticated query and booking passed. A same-day QR rendered, changed automatically, disappeared on background and refreshed after resume. Native SECURE and KEEP_SCREEN_ON flags were confirmed. Sunday 15 Nov 08:30 was booked and cancelled through the Campus Helper UI; My trips then showed no upcoming trips. No bus scanner verification or physical-device verification has been performed.
- Important residual test state: the first 13 Nov 17:10 booking crossed departure time before cancellation. The school removed its cancellation link while retaining a Booked history card. It was not cancelled. History cards without action IDs are now recognized without inventing actionable IDs; a regression test covers this state.
- npm run check passed: 345 tests passed, 15 skipped, lint/format/typecheck passed. Next production build exited successfully with warnings in existing notification prerender and lost-found filesystem tracing code. Android debug build passed.
- The installed APK uses a local development server and is not an offline standalone or production release.

## Sources

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor Android plugins](https://capacitorjs.com/docs/plugins/android)
- [AndroidX WebViewCompat](https://developer.android.com/reference/androidx/webkit/WebViewCompat)

The school HTML is an undocumented integration surface. Unexpected page titles or structures fail closed; new school releases may require adapter updates. Retest authenticated operations before distributing the app.

## UI baseline synchronization (2026-11-13)

The native worktree now includes Claude UI redesign commit `1607a8c` (PR #62), migrated from the previous `999d679` baseline. The Services entry uses the new widget card styling, and the shuttle page uses the shared DatePicker. Final new-service visual design remains assigned to Claude.

MuMu exposed an Android ICU issue: en-CA formatted dates as MM/DD/YYYY, crashing the new calendar. The shared dayKey helper now assembles year/month/day from formatToParts; its regression test failed before the fix and passed afterward. MuMu calendar opening, Sunday selection and authenticated school schedule query passed after migration. No new real bookings were created during UI synchronization.

Services and the web-only shuttle platform notice were checked at 375/768/1280px in light/dark themes: no horizontal overflow or page errors. Android dark-theme tokens and calendar rendering were confirmed separately. Earlier booking/QR/cancellation results above are pre-migration evidence, not a repeated write test after migration.
