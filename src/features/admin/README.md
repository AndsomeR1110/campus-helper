# Admin

Owner: **Member 5**. Reports, moderation and audit log.

- Pages: PG-19 `/admin`
- Entities: `Report`, `AuditLog`
- Acceptance: LF-AC-09
- Public entries: `@/features/admin` (report dialog, decision buttons) and `@/features/admin/server` (queue, decisions, audit)

Structure and rules: [docs/frontend-architecture.md §4](../../../docs/frontend-architecture.md).

## What the screen does

`/admin` reads the pending reports, the handled ones and the audit trail in one call.
A pending report shows the post's title and kind, the reporter's display name, the
reason and the timestamp, plus two actions:

- **Hide post** — the lost & found moderator path flips the post to `HIDDEN`, the
  report becomes `RESOLVED` and an audit entry `REPORT_RESOLVED_POST_HIDDEN` is written.
  The post leaves every list and detail page for ordinary viewers; its author still
  sees it in My posts.
- **Keep post** — the report becomes `DISMISSED` and `REPORT_DISMISSED` is audited.

Both sit behind a confirmation dialog and both refresh the server data afterwards.

## Access

`src/app/admin/layout.tsx` asks `getCurrentAdmin()`. Until `feat/auth-and-roles` lands
that adapter returns `null` unless `LOST_FOUND_DEMO_ADMIN=1` is set, so the screen is
closed by default rather than open by accident.

The service keeps the distinction the API needs:

| Caller                  | Response              |
| ----------------------- | --------------------- |
| no session              | `401 UNAUTHENTICATED` |
| signed in, not an admin | `403 FORBIDDEN`       |
| `ADMIN`                 | the queue             |

The moderation seam therefore takes the _actor_, not a pre-filtered admin: the role
check happens in `rules.requireModerator`, which is where `requireRole("ADMIN")` will
plug in.

## Composition

```
getModerationRuntime()                 server/container.ts
  ├── repository                       memory (demo) | Prisma
  ├── lostFound                        the lost-found service (hide / summary)
  ├── currentViewer / currentActor     session adapters
  └── now / nextId
```

Reports by ordinary users go through the same runtime: the detail page's
`ReportDialog` posts to `/api/lost-found/posts/:id/reports`, which is a report route
even though it lives under `lost-found` — the URL follows the resource, not the module.

## Known limits

- **Hiding a post and writing the audit entry are two writes, not one transaction.**
  With the in-memory store that cannot fail halfway; on Prisma it should move into a
  single `$transaction`.
- The in-memory moderation repository is demo scaffolding so the screen is not empty
  without a database; Prisma mode is the real path.
- `/admin` has no entry in the bottom navigation (it is not a student surface). Open it
  directly.
- No Playwright coverage yet; LF-AC-09 is covered by `__tests__/moderation.test.ts`.
