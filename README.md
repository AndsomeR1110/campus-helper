# Campus Helper

A campus companion PWA for students: book teacher office hours, reserve study spaces, keep a unified class schedule with reminders, and reunite lost items — all in one place.

> Team project for ENT207TC — 5-member team, GitHub flow (feature branches + pull requests).

## Core Features

- **Office Hours** — search teachers, view slots, book and cancel office hour appointments
- **Study Spaces** — filter seats by building / floor / date / time and reserve them
- **Class Reminder** — weekly timetable, unified schedule, `.ics` export and notifications
- **Lost & Found** — post & search lost/found items, private claims, admin moderation

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma · Vitest

## Team & Module Ownership

| Member            | Role                              | Owns                                                                      | Branches                                                                                                                       |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Member 1 — Ran An | Project lead, UI/UX, integration  | `src/components/ui/`, `src/app/layout.tsx`, design system, PWA foundation | `chore/project-setup`, `feat/design-system`, `feat/app-layout`, `feat/pwa-foundation`                                          |
| Member 2          | Auth & Office Hours               | `src/features/office-hours/`, `src/lib/auth/`                             | `feat/auth-and-roles`, `feat/database-foundation`, `feat/office-hour-management`, `feat/office-hour-booking`                   |
| Member 3          | Study Spaces & Bookings           | `src/features/spaces/`, `src/features/bookings/`                          | `feat/space-list-and-filter`, `feat/space-availability`, `feat/space-booking`, `feat/unified-bookings`                         |
| Member 4          | Courses, Schedule & Notifications | `src/features/courses/`, `src/features/notifications/`                    | `feat/course-management`, `feat/weekly-schedule`, `feat/unified-calendar`, `feat/notification-service`, `feat/calendar-export` |
| Member 5          | Lost & Found & Admin              | `src/features/lost-found/`, `src/features/admin/`                         | `feat/lost-found-posts`, `feat/lost-found-search`, `feat/lost-found-claims`, `feat/admin-moderation`                           |

Each member implements the frontend, API, database logic and tests for their own module.

## Workflow Rules

1. All feature work branches from the latest `main`: `feat/<module>-<task>` (also `fix/…`, `chore/…`).
2. One PR = one clearly scoped task.
3. A PR needs at least **one review from a non-author member** before the project lead merges it.
4. Every PR description must include: what it does, how to test it, and result screenshots.
5. Never push feature work directly to `main`.
6. Database schema changes require Member 2's review; unified schedule / notification data interfaces are coordinated with Member 4.
7. Shared UI components and the global layout are maintained by Member 1.
8. A feature is done only when it passes the corresponding PRD acceptance criteria.

## Project board

Tasks and PR status: **<https://andsomer1110.github.io/campus-helper/>** (add `#M3` etc. to filter by member). New tasks are GitHub issues created with the **任务** template — see [board/README.md](board/README.md).

## Documentation

| Document                                                       | Contents                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [docs/prd.md](docs/prd.md)                                     | Product requirements (PRD V1.0): scope, user flows, FR / AC IDs, test plan                       |
| [docs/team-assignment.md](docs/team-assignment.md)             | Team roles, owned modules, pages, entities and PR list                                           |
| [CONTRIBUTING.md](CONTRIBUTING.md)                             | Branches, commits, PR flow, code ownership, code style, API conventions, Definition of Done      |
| [docs/design/ui-ux-spec.md](docs/design/ui-ux-spec.md)         | Design tokens, layout, shared components, interaction states, copy & date formats, accessibility |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Directory structure, route map, layering rules, data fetching, shared interfaces                 |

Read these before opening your first PR. Using an AI coding agent? See [docs/agent-prompts.md](docs/agent-prompts.md); project rules for agents live in `AGENTS.md`.

## Getting Started

**Requirements:** Node.js 22 (see `.nvmrc`; `nvm use` picks it up), npm, and [Docker Desktop](https://www.docker.com/products/docker-desktop/) for the local database. You can use your own PostgreSQL 14+ instead of Docker. If you do, set `DATABASE_URL` in `.env.local` to it; the database user must be allowed to create the `btree_gist` extension.

```bash
git clone https://github.com/AndsomeR1110/campus-helper.git
cd campus-helper
npm ci
cp .env.example .env.local   # Windows (PowerShell): Copy-Item .env.example .env.local
npm run db:up                # start PostgreSQL in Docker
npm run db:deploy            # apply all migrations
npm run db:seed              # fictional demo users, teachers and slots
npm run db:seed:spaces       # demo study-space seats
npm run dev
```

Before `npm run dev`, set `AUTH_SECRET` in `.env.local`, or login fails. It must be at least 32 characters; generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Open <http://localhost:3000>. Every seeded account uses the password `Password123!` (see `prisma/seed.ts` for the emails).

Class reminders are created by a scheduled job. Locally nothing schedules it; trigger one scan by hand while the app is running:

```bash
curl -X POST http://localhost:3000/api/notifications/scan
```

Web Push is optional locally. Without the `VAPID_*` keys in `.env.local`, in-app notifications still work.

Later, after pulling new migrations from `main`, run `npm run db:deploy` again. To start over with a clean database, run `npm run db:reset` (it deletes all local data, re-applies the migrations and seeds again).

> Prisma reads only `.env`, not `.env.local`. The `db:*` scripts load `.env.local` for it, so use them instead of calling `npx prisma …` directly.

### Scripts

| Command                                   | What it does                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`                             | Start the dev server (Turbopack)                                              |
| `npm run build` / `npm start`             | Production build / serve it                                                   |
| `npm run lint` / `npm run lint:fix`       | ESLint (Next.js rules + module import boundaries)                             |
| `npm run format` / `npm run format:check` | Prettier (also sorts Tailwind classes)                                        |
| `npm run typecheck`                       | Generate route types and run `tsc --noEmit`                                   |
| `npm test` / `npm run test:watch`         | Vitest unit tests (`src/**/*.test.ts(x)`)                                     |
| `npm run check`                           | Lint + format check + typecheck + tests — run before every push               |
| `npm run db:up` / `npm run db:down`       | Start / stop the local PostgreSQL container (data is kept between restarts)   |
| `npm run db:deploy`                       | Apply all pending migrations                                                  |
| `npm run db:migrate`                      | Create a new migration after editing `prisma/schema.prisma` (Member 2 review) |
| `npm run db:seed`                         | Insert the fictional demo data (safe to run again)                            |
| `npm run db:seed:spaces`                  | Insert the demo study-space seats (safe to run again)                         |
| `npm run db:reset`                        | Drop the local database, re-apply migrations and seed                         |
| `npm run db:studio`                       | Browse the database in Prisma Studio                                          |

CI runs the same checks plus `next build` on every pull request.

### Production mode and PWA testing

The service worker is only registered in production mode, so test offline behaviour, installation and push with:

```bash
npm run build
npm start
```

On your computer, <http://localhost:3000> counts as a secure origin, so the service worker and "Install app" work there.

On a phone, browsers only allow service workers, installation and push over **HTTPS**. Opening `http://<your-computer-ip>:3000` on the same Wi-Fi is fine for checking layout, but PWA features will not work. To test them on a phone:

- **Android + USB:** enable USB debugging, open `chrome://inspect/#devices` in desktop Chrome, turn on _Port forwarding_ for `3000 → localhost:3000`, then open `http://localhost:3000` in Chrome on the phone.
- **Any phone (iOS included):** start a temporary HTTPS tunnel with [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (`cloudflared tunnel --url http://localhost:3000`) and open the `https://….trycloudflare.com` address it prints. Anyone with that address can reach your local app, so only use seed data and stop the tunnel when you are done.

### Windows

Line endings are normalised to LF by `.gitattributes`. If you cloned **before** that file existed and `npm run format:check` reports many files, commit or stash your work, then refresh your checkout once:

```bash
git rm -r --cached . -q && git reset --hard
```

Fonts are self-hosted (`src/app/fonts/`), so `npm run build` works without access to Google Fonts.

### Editor

VS Code users: install the recommended extensions when prompted (`.vscode/extensions.json`). Format on save and ESLint auto-fix are pre-configured.

### Versions

Dependencies are pinned to exact versions (`package-lock.json` is committed). Always install with `npm ci`, and add new dependencies with `npm install --save-exact`. This project uses **Next.js 16** — read `AGENTS.md` and [docs/frontend-architecture.md §5.1](docs/frontend-architecture.md) for the conventions that differ from older Next.js tutorials.
