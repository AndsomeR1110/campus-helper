# Android automatic school timetable sync

Implementation workspace: `E:/ENT/campus-shuttle-app`, branch `feat/timetable-native-sync`. This builds on the existing local Android/shuttle integration and Claude UI baseline `1607a8c`. The interface is a functional connection/status screen; final design remains assigned to Claude.

## End-to-end behavior

Open My courses > Connect school timetable. The first connection opens an internal protected school WebView. After the user signs in, the plugin automatically navigates the current eBridge controls, discovers the personal TimetablePlus frame, loads the school page and fetches activities through its signed browser runtime. It closes the window after obtaining the snapshot and automatically saves to the current app account. No JSON upload/paste is part of this flow.

The connection page refreshes automatically when revisited after the first saved snapshot and supports explicit Refresh. It does not promise scheduled background refresh. A device-only encrypted timetable connection survives process restarts; expired or invalid timetable credentials fall back to school SSO. The normal website can read already saved courses but cannot itself establish the Android school connection.

Only 2026/27 S1 is enabled, using the existing project's 2026-09-07 week-one anchor. Other terms require an explicitly configured and verified calendar. Teaching weeks are kept as exact sets; endpoint slot ends are preserved in the private snapshot and displayed ten minutes earlier, matching the currently verified official timetable. No LM Core name-enrichment or automatic school-course reminder settings are included.

## Public UI contract for Claude

- Feature export: `@/features/school-timetable` -> `SchoolTimetableConnection` (functional component, actorId from the server's authenticated user).
- Public facade (also exported from `@/features/school-timetable`): `schoolTimetableAvailable()`, `readSyncState()`, `syncSchoolTimetable(expectedActor, stillActive?)`, `connectionError()`, `forgetSchoolConnection(actorId)` (clears the device connection, keeps saved courses).
- State: `{ version, syncedAt, term, count }`. Native operation: `SchoolTimetable.connect()` returns a validated snapshot, not a cookie/hash/navigation API.
- Keep initial connection, loading, saved/last-sync, offline, unavailable platform, cancellation, expiry/error and retry states. Successful native retrieval is not sufficient: wait for the server save response before showing success.
- Keep bridge lifecycle, active-account guard, exact-week semantics and source isolation. Do not replace them with preview fixtures. No enrollment hash, ticket or credential should appear in UI or logs.
- School-derived courses are read-only here and link to connection/refresh, not the manual editor. Matching manual slots are hidden in the combined view while retained in storage; unrelated manual courses remain visible. School refresh never writes/deletes manual Course rows.

## Storage / owner review

New Prisma model and additive SQL migration: `SchoolTimetable`, one snapshot per application owner, JSON payload, integer version and server sync time. Added to User with cascade on account deletion. Migration was applied only to the local development PostgreSQL database without reset. Member 2 must review the migration before merge/deployment; Member 4 must review the course/schedule contract changes. Existing tables are unchanged.

The server validates every activity and rejects duplicate source IDs, unknown terms, empty/partial/invalid snapshots. It atomically replaces only that owner's school snapshot with optimistic version checks; simultaneous or stale writes return conflict. This preserves other app accounts and all manual rows. A genuinely empty new school timetable currently requires future explicit empty-snapshot handling; an empty response does not erase saved data.

Exact weeks and school source are optional additions to the Course read type, consumed by occurrence generation. Existing manual course behavior stays intact. Native snapshots appear in the Courses list, current week and Home next-class reads through the existing public course interface. Existing school reminders are not generated from the snapshot.

## Security / operation

Caller must be the exact configured Campus Helper origin. Internal main-frame navigation is HTTPS and host-restricted. The reply bridge exists only on TimetablePlus and checks main frame, origin and a per-operation nonce. School passwords are never saved. The timetable bearer connection is stored only in the app private preferences encrypted with AES-256-GCM and an Android Keystore non-exportable key, scoped by app actor ID via authenticated data, with a 30-day cache expiry; it never reaches the app server. A caller-checked forgetConnection operation removes it. Other native credentials remain inside the private WebView/native workflow; the app server receives only whitelisted course fields. Native UI has screenshot protection. There is no arbitrary URL/JS or cookie export API.

School navigation is one-shot per document: polling must not click the same one-use eBridge ticket twice. EVL_020 receives at most one recovery from the official root, never replay of the stored URL. SSO password fields are never inspected. Request and response sizes, timeouts and input cardinality are bounded. Server writes require the current application session, expected actor and snapshot version; bad input does not replace the last successful snapshot.

Build: existing `npm run native:android` now compiles both adapter assets and registers the SchoolTimetable native plugin. The APK currently loads the local development site, not a published production deployment. Enable the reviewed migration and a trusted HTTPS site before distribution.

## Verification record (2026-11-13)

- MuMu Android 15 first login -> automatic portal navigation -> fetch -> native window closes -> automatic server save: passed; 7 teaching activities, 4 modules. Returned start/end display and week sets matched the previously verified school timetable.
- Subsequent refresh initially exposed repeated one-use navigation / EVL_020. Added document guard and bounded root recovery; final continuous-refresh verification recorded below when complete.
- PostgreSQL integration tests: four passed using disposable fictional users, covering replacement/deletion without manual writes, empty snapshot rejection, concurrent initial writers and owner/stale-version isolation. Fixtures were removed after the run.
- HTTP boundary checks: unauthenticated 401, foreign Origin 403, changed actor 409, oversized body 400; saved snapshot unchanged.
- Unit tests cover exact irregular teaching weeks, official display time, duplicate/invalid activities, no duplicate navigation click, origin rejection, credential-free field filtering and merged-source display.
- No physical-device test, cross-term test or production deployment is claimed. The existing departed shuttle test booking remains unrelated residual state described in native/README.md.

### Final validation update

The document navigation guard fixed the repeated-ticket failure. Consecutive authenticated MuMu refreshes advanced snapshot versions while retaining 7 activities and without repeated credential entry. The final APK and a local Next production build also completed the automatic retrieval/save flow. Cold process restart invalidated the original SSO session, so a device-only encrypted timetable connection was added. Final cold-restart verification then advanced snapshot version 7 -> 8 without credentials or user interaction; 7 activities remained, and the internal window closed automatically. Credentials were used only for this authorized test, never stored in project files, application logs or the connection cache.

`npm run check` passed: 376 tests passed and 19 skipped; four PostgreSQL snapshot integration tests were separately run against the local database and passed. Both web production build and Android debug build passed. Existing notification prerender-cookie logs and lost-found tracing warnings remain outside this change. HTTP rejection cases passed on the production build as well. Browser checks at 375/768/1280px, light/dark, showed 7 school course links and no horizontal overflow or page errors; the week timetable linked all 7 classes to the school connection page. MuMu rendered 7 combined school slots without overflow.

Legacy JSON imports do not carry provenance in the old schema and are treated as manual data. They are preserved; matching slots are folded in the combined view. Unrelated or changed legacy entries are not silently deleted. Full cleanup of legacy imports requires a separate explicit migration decision.

Keystore persistence verification: one encrypted preference envelope, no plaintext URL/path in the app connection preferences, APK confirmed to contain the credential-store implementation. On cold restart the saved encrypted connection was successfully decrypted and used to fetch/save without SSO input. App backup remains disabled. A corrupt/expired connection is forgotten and falls back to SSO; the school may revoke the hash independently of the local 30-day cache lifetime.
