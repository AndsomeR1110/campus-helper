# Campus Helper

A campus companion PWA for students: book teacher office hours, reserve study spaces, keep a unified class schedule with reminders, and reunite lost items — all in one place.

> Team project for ENT207TC — 5-member team, GitHub flow (feature branches + pull requests).

## Core Features

- **Office Hours** — search teachers, view slots, book and cancel office hour appointments
- **Study Spaces** — filter seats by building / floor / date / time and reserve them
- **Class Reminder** — weekly timetable, unified schedule, `.ics` export and notifications
- **Lost & Found** — post & search lost/found items, private claims, admin moderation

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma

## Team & Module Ownership

| Member | Role | Owns | Branches |
|---|---|---|---|
| Member 1 — Ran An | Project lead, UI/UX, integration | `src/components/ui/`, `src/app/layout.tsx`, design system, PWA foundation | `chore/project-setup`, `feat/design-system`, `feat/app-layout`, `feat/pwa-foundation` |
| Member 2 | Auth & Office Hours | `src/features/office-hours/`, `src/lib/auth/` | `feat/auth-and-roles`, `feat/database-foundation`, `feat/office-hour-management`, `feat/office-hour-booking` |
| Member 3 | Study Spaces & Bookings | `src/features/spaces/`, `src/features/bookings/` | `feat/space-list-and-filter`, `feat/space-availability`, `feat/space-booking`, `feat/unified-bookings` |
| Member 4 | Courses, Schedule & Notifications | `src/features/courses/`, `src/features/notifications/` | `feat/course-management`, `feat/weekly-schedule`, `feat/unified-calendar`, `feat/notification-service`, `feat/calendar-export` |
| Member 5 | Lost & Found & Admin | `src/features/lost-found/`, `src/features/admin/` | `feat/lost-found-posts`, `feat/lost-found-search`, `feat/lost-found-claims`, `feat/admin-moderation` |

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

| Document | Contents |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, commits, PR flow, code ownership, code style, API conventions, Definition of Done |
| [docs/design/ui-ux-spec.md](docs/design/ui-ux-spec.md) | Design tokens, layout, shared components, interaction states, copy & date formats, accessibility |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Directory structure, route map, layering rules, data fetching, shared interfaces |

Read all three before opening your first PR.

## Getting Started

> Project scaffolding (Next.js + TypeScript + Tailwind CSS) lands in `chore/project-setup`. This section will be filled in there.
