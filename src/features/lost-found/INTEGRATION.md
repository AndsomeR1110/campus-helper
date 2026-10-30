# Lost & Found — integration notes

Status: **works standalone against an in-memory demo store**, not yet wired to
Prisma, Auth.js or object storage. This document lists exactly what is
temporary, so the next PR can replace it without guessing.

## 1. What is stubbed, and where

| Dependency                                   | Stub                                                                                                               | Replace with                                                                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database (`prisma/schema.prisma`, Member 2)  | `src/features/lost-found/server/store.ts` (posts, claims), `src/features/admin/server/store.ts` (reports, audit)   | Prisma models `LostFoundPost`, `LostFoundClaim`, `Report`, `AuditLog` via the singleton in `src/lib/db.ts`; keep the same function signatures in `server/service.ts`                                                                           |
| Auth (`src/lib/auth`, Member 2)              | `src/features/lost-found/server/viewer.ts` → `getViewer()` returns a fixed student, `requireAdmin()` a fixed admin | `getCurrentUser()`, `requireUser()`, `requireRole("ADMIN")`. Keep `getViewer()` / `requireAdmin()` as thin re-exports so pages and route handlers do not change. Called from: both pages' data access, `admin/layout.tsx`, every route handler |
| Image upload (no storage in the project yet) | `ImageMeta` is validated (MIME type, ≤ 5 MB, 1 photo) and stored as metadata                                       | Upload to storage in `POST /api/lost-found/posts` and keep the returned URL on the post                                                                                                                                                        |
| Validation (zod would need a new dependency) | `validation.ts` (hand-written, same tagged-result shape)                                                           | `schemas.ts` with zod once the dependency is approved                                                                                                                                                                                          |

`INTEGRATION.md` lives next to the feature so it is visible from the module's
README and from the PR diff.

## 2. What the module owns

```
src/features/lost-found/
├── index.ts              client-safe public entry
├── server/index.ts       server public entry (queries + mutations)
├── types.ts              entities and view models
├── constants.ts          limits, categories, labels
├── validation.ts         input validation (LF-AC-02, LF-AC-03)
├── filters.ts            keyword / type / category filtering (LF-AC-04)
├── rules.ts              pure permission and state rules
├── components/           PostCard, PostFilterBar, PostForm, ClaimPanel,
│                         PostOwnerActions, ReportDialog
├── server/
│   ├── service.ts        the only reader/writer of the store
│   ├── store.ts          demo data (delete with the Prisma PR)
│   ├── viewer.ts         demo session (delete with the auth PR)
│   ├── errors.ts         HttpError + helpers
│   └── http.ts           JSON response helpers, `{ data }` / `{ error }`
└── __tests__/            LF-AC-01 … LF-AC-08

src/features/admin/
├── index.ts              types + ReportActions
├── server/index.ts       createReport, listReports, decideReport, listAuditLog
├── moderation.ts         ReportDecision, ModerationReport, AuditEntry, rules
├── components/report-actions.tsx
└── __tests__/            LF-AC-09
```

Routes:

| File                                                      | Purpose                |
| --------------------------------------------------------- | ---------------------- |
| `src/app/(main)/lost-found/page.tsx`                      | PG-14 list + filters   |
| `src/app/(main)/lost-found/new/page.tsx`                  | PG-15 create           |
| `src/app/(main)/lost-found/[id]/page.tsx` + `loading.tsx` | PG-16 detail, claims   |
| `src/app/(main)/my/posts/page.tsx`                        | PG-17 My Posts         |
| `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`      | PG-19 moderation queue |

API (all `POST`, all return `{ data }` or `{ error: { code, message, fields? } }`):

| Endpoint                               | Body                                 | Rules                      |
| -------------------------------------- | ------------------------------------ | -------------------------- |
| `/api/lost-found/posts`                | `NewPostInput`                       | LF-AC-01/02/03             |
| `/api/lost-found/posts/[id]/status`    | `{ status: "RESOLVED" \| "CLOSED" }` | author only, LF-AC-08      |
| `/api/lost-found/claims`               | `{ postId, message }`                | LF-AC-05, never the author |
| `/api/lost-found/claims/[id]/decision` | `{ decision: "ACCEPT" \| "REJECT" }` | post author only, LF-AC-07 |
| `/api/lost-found/reports`              | `{ postId, reason }`                 | LF-AC-09                   |
| `/api/admin/reports/[id]/decision`     | `{ decision: "HIDE" \| "DISMISS" }`  | ADMIN only                 |

## 3. Acceptance criteria → evidence

| AC       | Behaviour                                     | Where                                                  |
| -------- | --------------------------------------------- | ------------------------------------------------------ |
| LF-AC-01 | valid post appears in the list                | `__tests__/lost-found.test.ts` → "LF-AC-01 publishes…" |
| LF-AC-02 | empty required fields are blocked and named   | "LF-AC-02 rejects missing required fields"             |
| LF-AC-03 | wrong MIME type / oversized image rejected    | "LF-AC-03 rejects an unsupported image type…"          |
| LF-AC-04 | keyword, type and category filtering          | "LF-AC-04 filters by keyword, type and category"       |
| LF-AC-05 | another student can claim an Open post        | "LF-AC-05 lets another student claim…"                 |
| LF-AC-06 | private claim text hidden from others         | "LF-AC-06 hides private claim text…"                   |
| LF-AC-07 | no new claims after Resolved                  | "LF-AC-07 rejects every other claim…"                  |
| LF-AC-08 | cannot edit/close another user's post         | "LF-AC-08 forbids editing another user's post"         |
| LF-AC-09 | reporter cannot see the queue; admin can hide | `admin/__tests__/moderation.test.ts`                   |

Manual checks that are **not** covered by unit tests (browser needed):

- 375 px, 768 px, 1280 px layouts for PG-14 … PG-17, PG-19.
- Image picker rejects a `.gif` and a 6 MB file in the real form.
- Toast + `router.refresh()` after each mutation.

## 4. Demo viewer

`getViewer()` always returns **Wei Chen (student)**, so:

- `/lost-found` shows the list as Wei sees it, including reports he can file.
- `/my/posts` shows the three posts authored by `u-1001`.
- `/admin` uses `requireAdmin()`, which returns the **Duty Officer (admin)** viewer,
  so the queue is reachable in the demo build.
- To test the "author" side of a post, open one of Wei's posts
  (`post-02`, `post-04`, `post-08`, `post-09`); to test claiming, open
  someone else's (`post-01`, `post-03`, `post-05`, `post-07`, `post-10`).

## 5. Known limitations

1. Mutations live in module memory: a server restart restores the seed, and a
   second browser session shares the same state. That is acceptable for the
   demo build but must not ship.
2. `Date.now()` is only used inside mutations and inside validation of
   `occurredAt` — never during render, so `cacheComponents` can prerender the
   pages. The relative-time helpers in `@/lib/time` are deliberately unused in
   server components.
3. No pagination beyond `MAX_LIST_ITEMS = 50`; the database query replaces it.
