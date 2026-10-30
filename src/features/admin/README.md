# Admin (Member 5)

The moderation side of the Lost & Found board: the report queue, the decision to
hide a post, and the audit trail of administrator actions.

| Page                         | Route    |
| ---------------------------- | -------- |
| Moderation dashboard (PG-19) | `/admin` |

```
moderation.ts        ReportDecision, ModerationReport, AuditEntry, canDecideReport
components/          ReportActions (hide / keep buttons)
server/service.ts    createReport, listReports, decideReport, listAuditLog
server/store.ts      demo reports + audit rows (Prisma replaces this)
```

## Rules

- Only a viewer with `role === "ADMIN"` reaches the queue or the decision
  endpoint; `src/app/admin/layout.tsx` calls `requireAdmin()` on the server
  before rendering, and the service re-checks.
- A report is decided once: `PENDING → RESOLVED` (post hidden) or
  `PENDING → DISMISSED` (post stays visible).
- Every decision writes an audit row (`actorId`, `action`, `targetId`, `note`,
  `createdAt`), which is what PRD FR-AD-04 asks for.

## Stubs

`requireAdmin()` is a fixed demo administrator until Member 2's
`feat/auth-and-roles` merges, and the queue is kept in memory until the Prisma
schema exists. Replacement points are listed in
`src/features/lost-found/INTEGRATION.md` §1.
