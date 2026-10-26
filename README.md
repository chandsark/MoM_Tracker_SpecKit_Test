# MoM Tracker — Meetings, Action Items & Issues

Record meetings, the action items agreed in them, and the issues raised against those items, with
end-to-end traceability (issue → action item → meeting), change history, filtering, CSV export,
and soft delete with restore.

- **Backend**: Node.js + Express + Prisma (SQLite) — `backend/`
- **Frontend**: React + Vite + TanStack Query — `frontend/`
- **Shared**: Zod schemas and enums used by both sides — `shared/`
- **End-to-end tests**: Playwright + axe — `e2e/`

## Prerequisites

- Node.js 22 LTS and npm 10+
- No database server — SQLite files are created under `backend/prisma/`
- For end-to-end tests: `npx playwright install chromium`

## Setup

```bash
npm install                              # installs every workspace
cp backend/.env.example backend/.env     # PowerShell: Copy-Item backend/.env.example backend/.env
npm run db:migrate                       # creates backend/prisma/dev.db
npm run db:seed                          # optional demo data (safe to run twice)
npm run dev                              # API http://localhost:3000, web http://localhost:5173
```

Set `SESSION_SECRET` in `backend/.env` to a long random string. For a large data set, run
`npm run db:seed -- --volume=10000`.

## Seeded accounts

All use the password `Password123!`.

| Email                | Role in the demo data             |
| -------------------- | --------------------------------- |
| `olivia@example.com` | Organizer of both demo meetings   |
| `arjun@example.com`  | Assignee of the demo action items |
| `mei@example.com`    | Registered participant            |
| `sam@example.com`    | Not a participant (read-only)     |

## Scripts

| Command                                         | What it does                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                                   | Runs the API and web app together with hot reload                                     |
| `npm run build`                                 | Builds the frontend into `frontend/dist`                                              |
| `npm start`                                     | Starts the API; with `NODE_ENV=production` it also serves `frontend/dist`             |
| `npm run db:migrate`                            | Applies Prisma migrations                                                             |
| `npm run db:seed`                               | Seeds demo users, meetings, items and an issue                                        |
| `npm run user:deactivate -w backend -- <email>` | Removes a user: blocks sign-in; their open items show "needs reassignment"            |
| `npm run lint` / `npm run format`               | ESLint / Prettier (`npm run format:check` verifies)                                   |
| `npm run typecheck`                             | TypeScript in every workspace                                                         |
| `npm test`                                      | Unit, contract and integration tests (Vitest) in every workspace                      |
| `npm run test:e2e`                              | Playwright end-to-end, keyboard and accessibility tests (desktop and 360 px)          |
| `npm run check`                                 | Lint, format check, typecheck, tests, OpenAPI lint and licence check — the merge gate |

`npm run check` and `npm run test:e2e` must both pass before merging.

## Specification and design

Everything for this feature is in [`specs/001-meeting-action-tracker/`](specs/001-meeting-action-tracker/):

- [spec.md](specs/001-meeting-action-tracker/spec.md) — user stories and requirements
- [plan.md](specs/001-meeting-action-tracker/plan.md) — architecture and tech stack
- [data-model.md](specs/001-meeting-action-tracker/data-model.md) — entities, states, authorization matrix
- [contracts/](specs/001-meeting-action-tracker/contracts/) — OpenAPI, CSV export format, UI routes
- [quickstart.md](specs/001-meeting-action-tracker/quickstart.md) — validation scenarios V1–V7
- [tasks.md](specs/001-meeting-action-tracker/tasks.md) — implementation task list
