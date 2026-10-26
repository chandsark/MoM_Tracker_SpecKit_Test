# Implementation Plan: Meeting, Action Item & Issue Tracking with End-to-End Traceability

**Branch**: `001-meeting-action-tracker` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-meeting-action-tracker/spec.md`

## Summary

A web app where signed-in users record meetings (description, date, participants), create action
items from each meeting (assignee, start/due dates, status incl. Blocked, comments), and raise
issues against action items. Assignees and organizers update progress; participants can comment
and raise issues. Every change is audited, deletes are soft and restorable, lists are filterable
and exportable to CSV, and a traceability view shows meeting → action items → issues.

Technical approach: TypeScript monorepo (npm workspaces) with an Express REST API backed by SQLite
through Prisma, and a React + Vite single-page frontend. Validation schemas live in a `shared`
package used by both sides. Server-side sessions, optimistic locking, batch-based soft delete, and
transactional change history implement the cross-cutting rules (see [research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript 5.x (strict) on Node.js 22 LTS

**Primary Dependencies**: Backend — Express 4, Prisma, Zod, bcryptjs, pino, express-rate-limit.
Frontend — React 19, Vite, React Router 7 (`react-router` package), TanStack Query, React Hook
Form. Shared — Zod schemas. *(Amended 2026-10-26: originally React 18 + `react-router-dom`; see
research.md R9.)*

**Storage**: SQLite (file, WAL mode) via Prisma migrations; designed to switch to PostgreSQL by
changing the Prisma provider

**Testing**: Vitest (unit + component), Supertest (API contract/integration on a real SQLite test
DB), React Testing Library, Playwright + @axe-core/playwright (end-to-end and accessibility)

**Target Platform**: Node.js server (Windows/Linux); current desktop and mobile browsers

**Project Type**: Web application (frontend + backend + shared package)

**Performance Goals**: Filtered lists and CSV exports return in < 2 s with 10,000 action items
(SC-004); typical page interactions < 500 ms on a local network

**Constraints**: WCAG 2.1 AA; usable from 360 px width; no silent overwrites (optimistic
locking); no sensitive content in logs; single-writer SQLite (fine for one team); all runtime and
development dependencies MUST use free, OSI-approved licences (allow-list: MIT, Apache-2.0,
BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, 0BSD, BlueOak-1.0.0) — no paid or commercial licences and
no paid cloud services (e.g., Prisma Accelerate/Optimize/Postgres, Redocly hosted platform,
Microsoft's hosted Playwright testing on Azure); enforced by `npm run lint:licenses` (research R16)

**Scale/Scope**: Single team/organization, up to ~200 users, 10,000 action items, ~12 screens,
~30 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | How the plan complies | Pre-research | Post-design |
|------------------|-----------------------|:---:|:---:|
| I. Spec-Driven Development | Spec approved with 5 clarifications; plan, contracts and tasks trace to FR IDs | ✅ | ✅ |
| II. Test-First (NON-NEGOTIABLE) | Each story gets failing contract tests (Supertest), unit tests (policy, validation, history), and a Playwright scenario before implementation; tasks will order tests first (R13) | ✅ | ✅ |
| III. Action Item Integrity & Traceability | Required FKs meeting→item→issue; status enums and transitions in data-model; transactional ChangeHistory (R8); confirmed, auditable soft deletes (R7) | ✅ | ✅ |
| IV. Accessible, Responsive UX | jsx-a11y lint + axe in every e2e run; 360 px layout; ≤3 interactions to core flows (ui-routes.md); uniform friendly errors | ✅ | ✅ |
| V. Simplicity & Security by Default | Single API + SPA, no extra services; server-side Zod validation; React escaping (no `dangerouslySetInnerHTML`); Prisma parameterized queries; HttpOnly session cookie, CSRF header, rate-limited login; secrets via `.env` (git-ignored); authZ policy on every route | ✅ | ✅ |
| Tech: contract documented first | [contracts/openapi.yaml](./contracts/openapi.yaml) (lints valid), csv-export.md, ui-routes.md | ✅ | ✅ |
| Tech: explicit migrations | `prisma migrate` | ✅ | ✅ |
| Tech: UTC storage, local display | Timestamps UTC; calendar dates as `YYYY-MM-DD`; `today` param for overdue (R12) | ✅ | ✅ |
| Tech: structured logging | pino JSON logs without meeting content (R14) | ✅ | ✅ |
| Workflow gates | `npm run check` (lint, typecheck, tests) + `npm run test:e2e` | ✅ | ✅ |

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-meeting-action-tracker/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (R1–R15)
├── data-model.md        # Entities, enums, state transitions, authorization matrix
├── quickstart.md        # Run + validation scenarios V1–V7
├── contracts/
│   ├── openapi.yaml     # REST API contract
│   ├── csv-export.md    # CSV format and columns
│   └── ui-routes.md     # Screens, routes, UI rules
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
package.json                 # npm workspaces + root scripts (dev, check, test:e2e, db:*)
shared/
└── src/
    ├── enums.ts             # statuses, severities
    ├── schemas/             # Zod request/response schemas (auth, meeting, actionItem, issue, filters)
    └── index.ts

backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts              # demo data + --volume option for performance checks
├── src/
│   ├── app.ts               # Express app (middleware, routes, error handler)
│   ├── server.ts
│   ├── config.ts
│   ├── middleware/          # session auth, csrf header, rate limit, request logging, errors
│   ├── auth/                # register, login, logout, session store
│   ├── policy/              # authorization rules (pure functions)
│   ├── history/             # change-history diff + writer
│   ├── softDelete/          # batch delete / restore helpers, not-deleted query scope
│   ├── meetings/            # routes.ts, service.ts
│   ├── actionItems/         # routes.ts, service.ts, csv.ts
│   ├── issues/              # routes.ts, service.ts, csv.ts
│   ├── comments/
│   ├── users/
│   └── lib/                 # dates, csv writer, pagination, errors
└── tests/
    ├── unit/
    ├── contract/            # one file per openapi tag
    └── integration/         # cross-entity flows (soft delete cascade, traceability)

frontend/
├── src/
│   ├── main.tsx, App.tsx, routes.tsx
│   ├── api/                 # typed fetch client + TanStack Query hooks
│   ├── components/          # forms, tables, filters, dialogs, breadcrumb, status badge
│   ├── pages/               # one per route in ui-routes.md
│   ├── auth/                # session context, protected route
│   └── styles/              # tokens.css, CSS modules
└── tests/                   # component tests

e2e/
└── *.spec.ts                # Playwright: one spec per validation scenario V1–V7
```

**Structure Decision**: Web application layout with `backend/` and `frontend/`, plus a small
`shared/` package so the Zod schemas behind the API contract are written once (constitution:
contract kept in sync with code). Backend is organised by feature folder (meetings, actionItems,
issues) with cross-cutting concerns (policy, history, softDelete) as their own modules so they
can be unit-tested in isolation. End-to-end tests live at the root because they span both apps.

## Complexity Tracking

No constitution violations. The `shared` package is the only structural addition beyond a plain
frontend/backend split and is justified in the Structure Decision above.
