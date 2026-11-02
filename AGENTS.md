<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CAMPUS HELPER — Project rules for coding agents

These rules apply to every agent working in this repository, for every team member. They summarise the team docs; when in doubt, the docs win. The UI is English; docs and discussion are mostly Chinese.

## Read before you start

| Doc                             | Why                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `docs/prd.md`                   | Requirements. Every feature maps to FR and AC IDs (e.g. FR-OH-04, OH-AC-03) — implement and test against them. |
| `docs/team-assignment.md`       | Who owns which module, pages, entities and branches.                                                           |
| `CONTRIBUTING.md`               | Branches, commits, PRs, ownership, API conventions, Definition of Done.                                        |
| `docs/design/ui-ux-spec.md`     | Tokens, layout, components, states, copy and date formats.                                                     |
| `docs/frontend-architecture.md` | Directory structure, routes, layering, data fetching, shared interfaces, Next.js 16 notes (§5.1).              |
| `src/components/ui/README.md`   | Which shared component to use for what.                                                                        |

Ask the user which member / module they are if it is not clear. Then stay inside that module's folders.

## Workflow (non-negotiable)

- Never commit or push to `main`. Work on a branch from the latest `main` named per CONTRIBUTING §1 (e.g. `feat/space-availability`). One branch = one PR = one task from `docs/team-assignment.md`.
- Commit messages: Conventional Commits in English, scope = module (`feat(spaces): …`).
- Run `npm run check` (lint, format, typecheck, tests) and `npm run build` before every push. Do not push red code.
- Open PRs with `.github/pull_request_template.md`, listing the PG and AC IDs covered and real test steps. Do not merge your own PR; the project lead merges after a non-author review.
- Install dependencies with `npm ci`. Add new ones with `npm install --save-exact` and justify them in the PR. Never upgrade Next.js, React, Tailwind or TypeScript in a feature PR.
- Never commit secrets or `.env.local`. Document new variables in `.env.example`.
- Never rewrite shared history (no force-push to shared branches, no rebasing others' work).

## Ownership

- Only edit files in your own module (`src/features/<module>/`, its `src/app/` routes and `src/app/api/` handlers, its tests).
- Shared files need their owner: `src/components/`, `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/utils.ts`, `src/lib/time.ts`, PWA files → Member 1. `prisma/schema.prisma`, migrations, `src/lib/auth/`, `src/lib/db.ts` → Member 2 reviews. `ScheduleEvent` and notification interfaces → Member 4.
- If you need a change in someone else's area, don't make it silently: build a local version in your module or describe the change in the PR / an issue and mention the owner.
- Use other modules only through `@/features/<module>` or `@/features/<module>/server` (ESLint enforces this).

## UI rules

- Build every page inside the app frame from `@/components/layout`: start with `<TopBar>`, wrap content in `<PageContainer>`, and put the primary action of detail / form pages in `<StickyActionBar>`. When you add a detail or form route, add its pattern to `FOCUSED_ROUTES` in `src/components/layout/nav-config.ts` (mention Member 1 in the PR).
- Build pages from `@/components/ui`. Do not hand-roll buttons, inputs, modals, badges, toasts or empty/error states.
- Colours, sizes, radii and shadows come from the semantic tokens only (`bg-primary`, `text-text-muted`, `text-title`, `rounded-md`…). Raw palette classes (`bg-blue-500`) and hex values are not allowed — the default palette is disabled anyway.
- Business statuses use `<StatusBadge kind=… status=… />`. Event / post types use `TypeTag`.
- Every data view has Loading (Skeleton), Empty (`EmptyState`) and Error (`ErrorState` + retry) states. Every cancel / delete goes through `ConfirmDialog`. Buttons that submit use `loading`.
- Never show success before the server confirms (no optimistic bookings). On `409` keep the user's input and explain the conflict.
- Format dates and times only with `@/lib/time` (Asia/Shanghai, 24h, "Mon 3 Nov, 14:00–16:00").
- Office hour and study space pages show `DemoDataNotice` (SP-AC-07).
- Check every page at 375px, 768px and 1280px. No horizontal scroll; keyboard-operable; labels on all controls; errors not by colour alone.
- UI copy: English, sentence case, specific verbs ("Cancel booking", not "OK").

## Server, data and security rules

- Check authentication and role on the server in every page query and API handler. `src/proxy.ts` is only for redirects, never for authorization.
- Take the user id from the session, never from the request body. Clients request actions (`POST …/cancel`); the server decides the resulting status.
- Validate all input with zod schemas in `src/features/<module>/schemas.ts`.
- API responses: `{ data }` or `{ error: { code, message } }` with the status codes in CONTRIBUTING §6.
- Bookings and claims: enforce rules in the database transaction with constraints/locks so concurrent requests cannot double-book (OH-AC-03, SP-AC-04). Never delete bookings — change their status.
- Store times as UTC; compute and display in Asia/Shanghai.
- Private data (claim descriptions, contact details) is filtered on the server before it reaches a client component.
- Seed data uses fictional people only.

## Next.js 16 specifics (see architecture §5.1)

- Read `node_modules/next/dist/docs/` for any API you are unsure about — training data is outdated.
- Cache Components is on: wrap request-time data (session, cookies, DB reads for the current user) in `<Suspense>` with a Skeleton fallback.
- Never use `"use cache"` for anything user-specific.
- Don't read the current time (`new Date()`, `Date.now()`) during prerender; render it inside `<Suspense>` or pass `now` explicitly.
- `params`, `searchParams`, `cookies()` and `headers()` are async.
- Every route with a dynamic segment (`[id]`) needs a `loading.tsx` (Skeleton), otherwise awaiting `params` fails the build.
- `error.tsx` receives `retry()` (not `reset()`); pass it to `ErrorState onRetry`.

## Tests

- Put business rules in pure functions (`server/rules.ts`) and unit-test them with Vitest. Name tests with the AC ID they prove, e.g. `it("rejects a second booking for the same slot (OH-AC-04)")`.
- Test files sit next to the code: `*.test.ts(x)`.

## When unsure

Stop and ask the user rather than inventing a shared interface, changing another module, changing the schema, or relaxing a rule above.
