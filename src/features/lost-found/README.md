# Lost & Found (Member 5)

Post an item you lost or found, search the board, claim what is yours, and let
an administrator moderate reported posts.

| Page                    | Route              |
| ----------------------- | ------------------ |
| List + filters (PG-14)  | `/lost-found`      |
| Create post (PG-15)     | `/lost-found/new`  |
| Detail + claims (PG-16) | `/lost-found/[id]` |
| My Posts (PG-17)        | `/my/posts`        |

## How it is put together

```
components/     PostCard, PostFilterBar, PostForm, ClaimPanel,
                PostOwnerActions, ReportDialog
filters.ts      keyword / type / category filtering (URL search params)
rules.ts        pure permission + state rules, unit-tested
validation.ts   field validation for every write (LF-AC-02, LF-AC-03)
server/         the only layer that touches data:
                service.ts (queries + mutations), store.ts (demo data),
                viewer.ts (demo session), errors.ts, http.ts
```

Dependencies point one way: pages → `features/lost-found` → `components/ui`,
`lib/`. Nothing in `components/ui` or `lib/` imports this module.

## Data and session are stubbed

`main` has no Prisma schema and no `src/lib/auth` yet, so posts and claims live
in module memory and every request acts as the same demo student.
**See [INTEGRATION.md](./INTEGRATION.md)** for the exact replacement points,
the acceptance-criteria mapping and the known limitations.

## Status semantics

```
OPEN ──claim submitted──▶ CLAIM_PENDING ──author accepts──▶ RESOLVED
  │                              │
  ├────author closes────▶ CLOSED │
  │                              └──author rejects all claims──▶ OPEN
  └──admin hides after a report──▶ HIDDEN (author + admin still see it)
```

A claim is `PENDING → APPROVED` or `PENDING → REJECTED`; accepting one claim
rejects the other pending ones, and a resolved or closed post accepts no new
claims.
