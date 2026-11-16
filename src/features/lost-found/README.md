# Lost & Found

Owner: **Member 5**. Posts, search, image upload, private claims and My Posts.

- Pages: PG-14 `/lost-found`, PG-15 `/lost-found/new`, PG-16 `/lost-found/[id]`, PG-17 `/my/posts`
- Entities: `LostFoundPost`, `LostFoundClaim`
- Acceptance: LF-AC-01 – LF-AC-08
- Public entries: `@/features/lost-found` (types, rules, schemas, components) and `@/features/lost-found/server` (service, handlers, runtimes)

Structure and rules: [docs/frontend-architecture.md §4](../../../docs/frontend-architecture.md).

## How a request flows

```
page / route handler
  └── getLostFoundRuntime()            server/container.ts   composition root
        ├── repository                 memory (demo) | Prisma
        ├── currentViewer              session adapter      → null until auth lands
        ├── storage                    disk                → .data/lost-found
        └── now / nextId               clock, uuid
  └── createLostFoundService(deps)     server/service.ts    rules + persistence
  └── createLostFoundHandlers(service) server/handlers.ts   zod → @/lib/api responses
```

Every collaborator is injected, so the service is tested without a database, a session
or a filesystem.

## Environment

| Variable                | Effect                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Unset → the demo runs on an in-memory repository seeded from `demo-data.ts`. Set → `createPrismaLostFoundRepository(prisma)`. |
| `LOST_FOUND_DEMO`       | `0` makes `getCurrentViewer()` return `null`, i.e. behave like a signed-out visitor.                                          |
| `LOST_FOUND_UPLOAD_DIR` | Where uploaded photos are written. Defaults to `.data/lost-found` (git-ignored).                                              |

## Images

`POST /api/lost-found/posts/:id/image` takes one `multipart/form-data` part named
`photo`. The server sniffs the bytes (PNG/JPEG/WebP), rejects a declared type that does
not match, enforces 5 MB, stores the file outside `public/` and exposes it through
`GET /api/lost-found/images/:key`. The four `image*` columns stay `NULL` when a post has
no photo.

## Models

`LostFoundPost` carries `kind`, `category`, `status`, the occurrence time and the
optional image columns; `LostFoundClaim` carries the private message and a
`PENDING → APPROVED | REJECTED` status. Invariants the database enforces:

- one `PENDING` claim per (post, claimant)
- at most one `APPROVED` claim per post
- `decidedAt` / `decidedById` present exactly when a claim is no longer pending

The service checks the same rules first so callers get `CONFLICT` instead of a raw
`P2002`.

## Acceptance coverage

| AC                                                  | Where                                                      |
| --------------------------------------------------- | ---------------------------------------------------------- |
| LF-AC-01 publish appears in the list                | `__tests__/service.test.ts`, `__tests__/handlers.test.ts`  |
| LF-AC-02 missing required fields are rejected       | `__tests__/schemas.test.ts`, `__tests__/handlers.test.ts`  |
| LF-AC-03 unsupported type / oversized file rejected | `__tests__/image.test.ts`, `__tests__/handlers.test.ts`    |
| LF-AC-04 filters match                              | `__tests__/filters.test.ts`, `__tests__/handlers.test.ts`  |
| LF-AC-05 non-author can claim an open post          | `__tests__/service.test.ts`                                |
| LF-AC-06 private claims stay private                | `__tests__/service.test.ts`, `repository.postgres.test.ts` |
| LF-AC-07 no new claims after the post is settled    | `__tests__/rules.test.ts`, `__tests__/service.test.ts`     |
| LF-AC-08 non-author cannot edit or delete           | `__tests__/rules.test.ts`                                  |

## Known limits

- `getCurrentViewer()` reads a demo identity (or `null`). When `feat/auth-and-roles`
  lands, replace that one file with the session helper; nothing else changes.
- The in-memory repository exists for the demo and the tests. It is not a production
  store and loses writes on restart.
- `path.join(root, \`${key}.${ext}\`)` triggers a Turbopack "dynamic filesystem access"
  warning at build time. It is harmless, but a static key layout would silence it.
- No Playwright coverage yet; the end-to-end paths were checked by hand (see the PR
  screenshots).

## AI text matches (PG-16)

Set `LOST_FOUND_AI_API_KEY` in `.env.local` or in the deployment environment and
restart the app. Set `LOST_FOUND_AI_PROVIDER` to `openai` (default) or `deepseek`
and use a key issued by that provider. The defaults are `gpt-4o-mini` and
`deepseek-flash`, respectively. Set `LOST_FOUND_AI_MODEL` to override the default
with a compatible model. An empty key or an unrecognized provider hides the feature.

- **LF-AI-AC-01:** The author of an active Lost post can request a match on its
  detail page. Candidates are active Found posts from other users, in the
  same category, reported from one day before to fourteen days after the loss.
  Already accepted claims are excluded. Matching locations and nearby times
  take priority when choosing up to 12 candidates for the model.
- **LF-AI-AC-02:** Show up to three unique links to eligible Found posts, each with
  a short reason. The user opens the Found post to use the existing claim form.
- **LF-AI-AC-03:** Show separate empty and retry states. User-triggered requests
  have a 12-second provider timeout and per-process limits of 5 calls per user
  per 10 minutes and 30 calls across the app per minute.
- **LF-AI-AC-04:** Send only public item text and occurrence time to the selected provider after
  masking common email, phone, long numeric ID and URL patterns. Request-local
  candidate numbers replace post IDs. Photos, author fields and private claim
  text are excluded.
