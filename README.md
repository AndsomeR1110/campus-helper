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

**Requirements:** Node.js 22 (see `.nvmrc`; `nvm use` picks it up) and npm.

```bash
git clone https://github.com/AndsomeR1110/campus-helper.git
cd campus-helper
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

### Scripts

| Command                                   | What it does                                                    |
| ----------------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                             | Start the dev server (Turbopack)                                |
| `npm run build` / `npm start`             | Production build / serve it                                     |
| `npm run lint` / `npm run lint:fix`       | ESLint (Next.js rules + module import boundaries)               |
| `npm run format` / `npm run format:check` | Prettier (also sorts Tailwind classes)                          |
| `npm run typecheck`                       | Generate route types and run `tsc --noEmit`                     |
| `npm test` / `npm run test:watch`         | Vitest unit tests (`src/**/*.test.ts(x)`)                       |
| `npm run check`                           | Lint + format check + typecheck + tests — run before every push |

CI runs the same checks plus `next build` on every pull request.

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
