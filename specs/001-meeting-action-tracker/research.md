# Research: Meeting, Action Item & Issue Tracking

**Feature**: `001-meeting-action-tracker` | **Date**: 2026-10-26

User-selected constraints: TypeScript full-stack, SQLite database. Each decision below resolves an
open item from the plan's Technical Context.

## R1. Runtime, language, and repository layout

- **Decision**: Node.js 22 LTS, TypeScript 5.x (strict mode), npm workspaces with three packages:
  `backend`, `frontend`, `shared`.
- **Rationale**: One language end to end; `shared` holds the Zod request/response schemas and
  enum values so the API contract is defined once and used by both sides (constitution: contract
  kept in sync with code).
- **Alternatives considered**: Two packages with duplicated types (drift risk); Turborepo/Nx
  (extra tooling not needed at this size — Simplicity principle).

## R2. Backend framework

- **Decision**: Express 4 with a thin layered structure (routes → services → Prisma).
- **Rationale**: Most widely known, minimal, excellent Supertest support for contract tests.
- **Alternatives considered**: Fastify (faster, but performance is not a bottleneck here);
  NestJS (heavier abstractions than the spec needs).

## R3. Database and data access

- **Decision**: SQLite via Prisma ORM; schema changes through `prisma migrate`. Status/severity
  values stored as strings and validated by shared Zod enums.
- **Rationale**: Zero-setup file database (user choice); Prisma gives typed queries and explicit
  migrations (constitution: explicit migrations). Storing enums as strings avoids
  connector-specific enum limitations and keeps a later move to PostgreSQL trivial.
- **Alternatives considered**: Drizzle (fine, smaller community for training); raw
  `better-sqlite3` (no migrations tooling); PostgreSQL (deferred; Prisma makes the switch a
  provider change plus migration).
- **Notes**: SQLite allows one writer at a time — acceptable for a single team; enable WAL mode.
  `LIKE` is case-insensitive for ASCII in SQLite, which covers keyword search.

## R4. Authentication and sessions

- **Decision**: Email + password self-registration; passwords hashed with bcrypt (cost 12, via
  `bcryptjs` to avoid native builds on Windows). Server-side sessions stored in a `Session` table,
  referenced by an opaque random ID in an `HttpOnly`, `Secure` (in production), `SameSite=Lax`
  cookie; 7-day sliding expiry.
- **Rationale**: Server-side sessions can be revoked on sign-out; HttpOnly cookie keeps the token
  away from scripts (XSS mitigation); no external identity provider needed (clarification Q3).
- **CSRF**: `SameSite=Lax` plus a required custom header (`X-Requested-With: fetch`) on all
  state-changing requests; the API rejects cross-site form posts.
- **Alternatives considered**: JWT in localStorage (XSS exposure, no revocation); Passport.js
  (adds abstraction for a single local strategy).
- **Extras**: Rate-limit sign-in attempts (`express-rate-limit`, 10/min per IP+email); minimum
  password length 10.

## R5. Authorization model

- **Decision**: Central policy module in the backend with pure functions
  (`canEditActionItem(user, item, meeting)`, etc.) used by every route; matrix in
  [data-model.md](./data-model.md#authorization-matrix).
- **Rationale**: One testable place for clarification Q1 rules; unit-tested exhaustively.
- **Alternatives considered**: Role tables / CASL (over-engineered for meeting-scoped roles).

## R6. Concurrent edit detection (FR-026)

- **Decision**: Optimistic locking with an integer `version` on Meeting, ActionItem, and Issue.
  Clients send the version they edited; the update uses `WHERE id = ? AND version = ?` and
  increments. Mismatch → HTTP 409 with the current record.
- **Rationale**: Simple, stateless, works with SQLite.
- **Alternatives considered**: Last-write-wins (violates FR-026); locks (bad UX, stale locks).

## R7. Soft delete and cascade restore (FR-025, FR-028)

- **Decision**: `deletedAt`, `deletedById`, and `deletionBatchId` columns on Meeting, ActionItem,
  and Issue. Deleting a record sets these on it and on all its not-yet-deleted descendants with a
  shared batch ID in one transaction. Restoring a record clears every row in its batch. Restoring a
  child whose parent is deleted is rejected (409).
- **Rationale**: Delete and restore "together" exactly as specified, while records deleted
  earlier and independently stay deleted.
- **Alternatives considered**: Archive tables (complex queries); a single `isDeleted` flag (cannot
  restore precisely).
- **Query rule**: All list/filter/traceability/export queries add `deletedAt IS NULL` via a single
  repository helper.

## R8. Change history / audit (FR-010, FR-015, SC-006)

- **Decision**: `ChangeHistory` table written inside the same transaction as each
  create/update/delete/restore; one row per changed field (`field`, `oldValue`, `newValue` as
  strings), plus action, entity type and ID, user, and UTC timestamp.
- **Rationale**: Same transaction guarantees 100% coverage; per-field rows make the history view
  trivial.
- **Alternatives considered**: DB triggers (cannot capture the acting user cleanly in SQLite);
  event sourcing (overkill).

## R9. Frontend

- **Decision**: React 19 + Vite, React Router 7, TanStack Query for server state,
  React Hook Form + Zod (shared schemas) for forms, plain CSS modules with design tokens.
- **Rationale**: Mainstream, fast dev loop; shared Zod schemas give identical client/server
  validation; no UI kit keeps bundle small and accessibility under our control.
- **Alternatives considered**: Next.js (SSR not needed); MUI (heavier; still needs a11y audits).
- **Amendment (2026-10-26)**: the plan originally named React 18 and `react-router-dom`. The
  implementation was built and fully tested on React 19 and React Router 7, where
  `react-router-dom` is merged into the single `react-router` package. Both are MIT-licensed,
  current releases, and need no API changes in this codebase; downgrading would add risk for no
  user-facing benefit, so the plan was amended to match (convergence task T119).
- **Accessibility**: semantic HTML, labelled controls, visible focus, `eslint-plugin-jsx-a11y`,
  automated `axe` checks in Playwright (constitution: WCAG 2.1 AA).

## R10. Filtering, pagination, performance (SC-004)

- **Decision**: Server-side filtering and offset pagination (default 50, max 200) with indexes on
  `actionItem(meetingId)`, `actionItem(assigneeId, status)`, `actionItem(dueDate)`,
  `issue(actionItemId, status)`, `meeting(meetingDate)`. Filter state is mirrored in the URL
  query string so filtered views are shareable.
- **Rationale**: SQLite with these indexes answers filters over 10k items in milliseconds; well
  within the 2-second target.
- **Alternatives considered**: Client-side filtering (does not scale, breaks CSV export
  consistency); cursor pagination (unnecessary at this volume).

## R11. CSV export (FR-030)

- **Decision**: `GET /api/action-items/export.csv` and `GET /api/issues/export.csv` accept the
  same filter parameters as the list endpoints, ignore pagination, stream RFC 4180 CSV with a UTF-8
  BOM (opens correctly in Excel). Cells starting with `=`, `+`, `-`, `@` are prefixed with `'` to
  prevent CSV formula injection.
- **Rationale**: Exact parity with on-screen filters; safe for spreadsheet users.
- **Alternatives considered**: Client-side CSV generation (only has the current page).

## R12. Dates and time zones

- **Decision**: Calendar dates (meeting date, start/due dates) stored as `YYYY-MM-DD` strings;
  timestamps stored as UTC. "Overdue" is computed against "today" passed by the client in its
  local time zone (`today` query parameter, validated), defaulting to the server's UTC date.
- **Rationale**: Avoids off-by-one errors around midnight; matches spec assumption.

## R13. Testing strategy (constitution: Test-First)

- **Decision**:
  - Backend unit: Vitest (policy, validation, history diffing, soft-delete logic).
  - Backend contract/integration: Vitest + Supertest against a fresh SQLite file per test run
    (Prisma migrate reset).
  - Frontend component: Vitest + React Testing Library.
  - End-to-end + accessibility: Playwright with `@axe-core/playwright` covering each user story.
- **Rationale**: One test runner across packages; fast; real database instead of mocks.

## R14. Logging and errors

- **Decision**: `pino` structured JSON logs (request ID, user ID, route, status, duration);
  meeting content, comments, and passwords are never logged. Errors use a uniform JSON shape
  `{ error: { code, message, details? } }`; no stack traces in responses.
- **Rationale**: Constitution observability and UX rules.

## R15. Quality tooling

- **Decision**: ESLint (typescript-eslint, jsx-a11y), Prettier, `tsc --noEmit` in CI;
  `npm run check` runs lint + typecheck + tests as the merge gate.

## R16. Licensing (free-to-use only)

- **Decision**: Every runtime and development dependency MUST be under a free, OSI-approved
  licence on this allow-list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, 0BSD,
  BlueOak-1.0.0 (plus CC0-1.0 and Python-2.0, which appear in common transitive dependencies).
  Found during install and also allowed (all free, no fees): MIT-0; CC-BY-3.0 / CC-BY-4.0 (data
  files in `spdx-exceptions`, `spdx-ranges`, `caniuse-lite`); `MIT*` / `BSD*` (licence inferred
  from the licence file, packages `decko`, `stickyfill`, `url-template` used by @redocly/cli);
  `(MPL-2.0 OR Apache-2.0)` (dompurify); `(MIT AND CC-BY-3.0)` (spdx-ranges).
  Paid cloud add-ons are out of scope: Prisma Accelerate / Optimize / Prisma Postgres, Redocly's
  hosted platform, and Microsoft's hosted Playwright testing on Azure.
- **Enforcement**: `license-checker` (BSD-3-Clause) runs as root script `lint:licenses` with
  `--excludePrivatePackages --onlyAllow "<allow-list>"` and is part of `npm run check`, so a
  non-free dependency fails the merge gate.
- **Verified licences (npm registry, 2026-10-26)**:
  - MIT: express, zod, cookie-parser, pino, pino-http, express-rate-limit, helmet, vitest,
    supertest, tsx, react, react-dom, react-router, @tanstack/react-query, react-hook-form,
    @hookform/resolvers, jsdom, @testing-library/*, vite, @vitejs/plugin-react, eslint,
    typescript-eslint, eslint-plugin-jsx-a11y, eslint-plugin-react-hooks, prettier, @redocly/cli,
    concurrently
  - Apache-2.0: prisma, @prisma/client, typescript, @playwright/test
  - BSD-3-Clause: bcryptjs, license-checker
  - MPL-2.0: axe-core, @axe-core/playwright — acceptable: weak, file-level copyleft that only
    applies if those files are modified; used unmodified as test-only dependencies
  - SQLite: public domain; Node.js: MIT
- **Rationale**: User requirement that nothing used for implementation needs a paid or commercial
  licence; an automated check keeps it true as dependencies change.
- **Alternatives considered**: Manual review only (drifts as dependencies are added).
