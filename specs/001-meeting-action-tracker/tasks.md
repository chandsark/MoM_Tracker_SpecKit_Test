---

description: "Task list for feature 001-meeting-action-tracker"
---

# Tasks: Meeting, Action Item & Issue Tracking with End-to-End Traceability

**Input**: Design documents from `specs/001-meeting-action-tracker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (openapi.yaml,
csv-export.md, ui-routes.md), quickstart.md

**Tests**: REQUIRED. The constitution (Principle II, Test-First, NON-NEGOTIABLE) mandates TDD:
every test task MUST be written and observed to FAIL before the implementation tasks that follow
it in the same phase.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
demonstrated on its own. Soft delete & restore (FR-025, FR-028) spans all stories and has its own
cross-cutting phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1–US5)
- Paths follow plan.md: `shared/`, `backend/`, `frontend/`, `e2e/` at repository root

## Conventions used by every task

- API shapes, error codes, and parameter names: `specs/001-meeting-action-tracker/contracts/openapi.yaml`
- Entities, enums, state transitions, and the **Authorization matrix**:
  `specs/001-meeting-action-tracker/data-model.md`
- Error responses are always `{ error: { code, message, details? } }` with no stack traces.
- Every state-changing request requires header `X-Requested-With: fetch`.
- Every create/update/delete/restore of Meeting, ActionItem, or Issue writes ChangeHistory rows in
  the same Prisma transaction (one row per changed field for `UPDATE`).
- Every list/detail/filter/traceability/export query excludes soft-deleted rows (`deletedAt IS NULL`)
  using the shared scope helper from T024.
- Backend tests run against a real SQLite test database via the helper from T033 — no DB mocks.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, tooling, and test runners

- [X] T001 Create root `package.json` with npm workspaces `["shared", "backend", "frontend"]` and scripts `dev` (runs backend and frontend concurrently), `check` (lint + typecheck + `test` in all workspaces + `lint:api` + `lint:licenses`), `test`, `test:e2e` (Playwright), `db:migrate`, `db:seed`, `lint:api` (`redocly lint specs/001-meeting-action-tracker/contracts/openapi.yaml`), `lint:licenses` (`license-checker --excludePrivatePackages --onlyAllow "MIT;MIT-0;MIT*;Apache-2.0;BSD-2-Clause;BSD-3-Clause;BSD*;ISC;MPL-2.0;0BSD;BlueOak-1.0.0;CC0-1.0;CC-BY-3.0;CC-BY-4.0;Python-2.0;(MPL-2.0 OR Apache-2.0);(MIT AND CC-BY-3.0)"` — fails if any dependency is not on the free-licence allow-list, research.md R16); add `license-checker` to root devDependencies; add `.gitignore` covering `node_modules/`, `dist/`, `*.db`, `*.db-journal`, `.env`, `playwright-report/`, `test-results/`
- [X] T002 Create `tsconfig.base.json` at repository root with `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `moduleResolution: bundler`; each workspace tsconfig extends it
- [X] T003 [P] Initialize `shared/` package: `shared/package.json` (name `@mom/shared`, deps `zod`), `shared/tsconfig.json`, `shared/vitest.config.ts`, empty barrel `shared/src/index.ts`
- [X] T004 [P] Initialize `backend/` package: `backend/package.json` with deps `express@4`, `@prisma/client`, `zod`, `bcryptjs`, `cookie-parser`, `pino`, `pino-http`, `express-rate-limit`, `helmet`, `@mom/shared`; devDeps `prisma`, `vitest`, `supertest`, `tsx`, `@types/*`; scripts `dev` (`tsx watch src/server.ts`), `test` (`vitest run`), `typecheck`; plus `backend/tsconfig.json` and `backend/vitest.config.ts` (`pool: 'forks'`, `singleFork: true` so tests share one SQLite file safely)
- [X] T005 [P] Initialize `frontend/` with Vite React TS: `frontend/package.json` (deps `react@18`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `@mom/shared`; devDeps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`), `frontend/vite.config.ts` proxying `/api` to `http://localhost:3000`, `frontend/vitest.config.ts` (jsdom, setup file `frontend/tests/setup.ts`), `frontend/index.html`
- [X] T006 [P] Configure linting/formatting: `eslint.config.js` at root (typescript-eslint strict, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` recommended, rule banning `dangerouslySetInnerHTML`), `.prettierrc` (printWidth 100, singleQuote)
- [X] T007 [P] Configure Playwright: `playwright.config.ts` at root (chromium + a 360×740 mobile project, `webServer` starting backend with a dedicated `e2e.db` and frontend), and `e2e/fixtures.ts` exporting `signIn(page, email)`, `register(page, name, email)`, and `expectNoA11yViolations(page)` using `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21aa`
- [X] T008 Create `backend/.env.example` (`DATABASE_URL=file:./dev.db`, `SESSION_SECRET=change-me`, `PORT=3000`, `NODE_ENV=development`) and `backend/src/config.ts` that parses `process.env` with Zod and fails fast on missing values

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared validation, auth, authorization, history, error handling, and
frontend shell that every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Schema & shared primitives

- [X] T009 Write `backend/prisma/schema.prisma` (provider `sqlite`, string CUID ids) with models exactly per data-model.md: **User** (`name` 1–100 chars, `email` unique stored lower-cased ≤254, `passwordHash`, `createdAt`, `deactivatedAt?`); **Session** (`id` = cookie value, `userId`, `expiresAt`, `createdAt`); **Meeting** (`description` "1–2000 chars", `meetingDate` String `YYYY-MM-DD`, `organizerId`, `version Int @default(1)`, timestamps, `deletedAt?`, `deletedById?`, `deletionBatchId?`); **MeetingParticipant** (`meetingId`, `userId?`, `externalName?`, `@@unique([meetingId, userId])`); **ActionItem** (`meetingId`, `description`, `assigneeId`, `startDate`, `dueDate`, `status String @default("OPEN")`, `version`, `createdById`, timestamps, soft-delete columns); **Comment** (`actionItemId`, `authorId`, `body`, `createdAt`); **Issue** (`actionItemId`, `title`, `description`, `severity`, `status String @default("OPEN")`, `raisedById`, `version`, timestamps, soft-delete columns); **ChangeHistory** (`entityType`, `entityId`, `action`, `field?`, `oldValue?`, `newValue?`, `actorId`, `createdAt`). Indexes: Meeting `meetingDate`, `organizerId`, `deletedAt`; ActionItem `meetingId`, `[assigneeId, status]`, `dueDate`, `deletedAt`; Issue `[actionItemId, status]`, `severity`, `deletedAt`; ChangeHistory `[entityType, entityId, createdAt]`
- [X] T010 Generate the initial migration (`npx prisma migrate dev --name init`) into `backend/prisma/migrations/` and create `backend/src/db.ts` exporting a singleton `PrismaClient` that runs `PRAGMA journal_mode=WAL;` on startup
- [X] T011 [P] Create `shared/src/enums.ts`: `ActionItemStatus` = `OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`; `IssueStatus` = `OPEN`, `IN_PROGRESS`, `RESOLVED`; `IssueSeverity` = `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; Zod enums for each; display-label maps (e.g., `IN_PROGRESS` → "In Progress"); severity rank for sorting; export from `shared/src/index.ts`
- [X] T012 [P] Write failing tests `shared/tests/common.test.ts` for the primitives in T013: `dateString` accepts `2026-02-28`, rejects `2026-02-30`, `26-1-1`, `2026/01/01`; `requiredText(max)` trims and rejects empty-after-trim and over-max; `pagination` defaults `page=1`, `pageSize=50`, rejects `pageSize` > 200 or < 1; `version` rejects < 1; strict objects reject unknown keys
- [X] T013 Implement `shared/src/schemas/common.ts` (`dateString`, `requiredText(max)`, `pagination`, `version`, `ErrorCode` enum with `VALIDATION_ERROR, UNAUTHENTICATED, INVALID_CREDENTIALS, FORBIDDEN, NOT_FOUND, EMAIL_TAKEN, VERSION_CONFLICT, OPEN_ISSUES_CONFIRMATION_REQUIRED, PARENT_DELETED, RATE_LIMITED, INTERNAL`) so T012 passes

### Backend cross-cutting modules (tests first)

- [X] T014 [P] Write failing unit tests `backend/tests/unit/dates.test.ts` for `isOverdue(dueDate, status, today)`: true when `dueDate < today` and status not `DONE`/`CANCELLED`; false on due date equal to today; `BLOCKED` past due is overdue; `resolveToday(param)` returns the validated param or the server UTC date
- [X] T015 [P] Write failing unit tests `backend/tests/unit/policy.test.ts` covering every row of the data-model.md Authorization matrix for roles organizer / assignee / registered participant / other signed-in user, including: only organizer edits meeting, creates action items, reassigns, deletes/restores; organizer + assignee change status/start/due date and edit issues; organizer + assignee + participant comment and raise issues; external participants (no user) grant nothing; deactivated users get no rights
- [X] T016 [P] Write failing unit tests `backend/tests/unit/history.test.ts` for `diffFields(before, after, fields)` returning one entry per changed field with string `oldValue`/`newValue`, nothing for unchanged fields, and assignee changes rendered as `"Name (id)"`
- [X] T017 [P] Write failing unit tests `backend/tests/unit/errors.test.ts` for the error handler: `AppError` → its status + code; `ZodError` → 400 `VALIDATION_ERROR` with per-field `details`; unknown error → 500 `INTERNAL` with generic message and no stack in body
- [X] T018 Implement `backend/src/lib/errors.ts` (`AppError(status, code, message, details?)` + helpers `forbidden()`, `notFound()`, `versionConflict(current)`) and `backend/src/middleware/errorHandler.ts` so T017 passes
- [X] T019 [P] Implement `backend/src/lib/dates.ts` (`isOverdue`, `resolveToday`) so T014 passes
- [X] T020 [P] Implement `backend/src/lib/pagination.ts` (`toSkipTake({page, pageSize})`, `pageResult(items, total)` → `{ items, total }`)
- [X] T021 Implement `backend/src/policy/index.ts` pure functions `canEditMeeting`, `canCreateActionItem`, `canUpdateActionItem`, `canReassign`, `canComment`, `canRaiseIssue`, `canEditIssue`, `canDelete`, `canRestore`, and `permissionsFor(user, context)` returning the `Permissions` object from openapi.yaml, so T015 passes
- [X] T022 Implement `backend/src/history/index.ts` (`diffFields` and `writeHistory(tx, { entityType, entityId, action, actorId, changes? })`) so T016 passes
- [X] T023 [P] Implement `backend/src/middleware/requestLogger.ts` with `pino-http` logging request id, user id, method, route, status, duration and redacting `req.body`, `req.headers.cookie`, and `password` fields (never log meeting content, comments, or passwords)
- [X] T024 [P] Implement `backend/src/softDelete/scope.ts` exporting `notDeleted = { deletedAt: null }` and `assertNotDeleted(record)` (throws `NOT_FOUND`) for use by every query
- [X] T025 [P] Implement `backend/src/middleware/csrf.ts` rejecting non-GET/HEAD requests without header `X-Requested-With: fetch` with 403 `FORBIDDEN`, and `backend/src/middleware/validate.ts` (`validateBody(schema)`, `validateQuery(schema)`)

### Authentication (FR-024, FR-029)

- [X] T026 Create test helper `backend/tests/helpers/testApp.ts`: before all, set `DATABASE_URL=file:./test.db` and run `prisma migrate reset --force --skip-seed`; `resetDb()` truncates all tables; `createUser({name, email})`; `agentFor(user)` returning a Supertest agent already signed in that sends `X-Requested-With: fetch` on every request
- [X] T027 [P] Write failing contract tests `backend/tests/contract/auth.test.ts`: `POST /api/auth/register` → 201, sets HttpOnly `sid` cookie with `SameSite=Lax`, email stored lower-cased; duplicate email (any case) → 409 `EMAIL_TAKEN`; name 0 or >100 chars, invalid email, password <10 chars → 400; `POST /api/auth/login` wrong password and unknown email both → 401 `INVALID_CREDENTIALS` with identical message; 11th attempt within a minute for same IP+email → 429; `GET /api/auth/me` without cookie → 401 `UNAUTHENTICATED`, with cookie → user without `passwordHash`; `POST /api/auth/logout` → 204 and the old cookie then gets 401; POST without `X-Requested-With` → 403
- [X] T028 [P] Create `shared/src/schemas/auth.ts`: `RegisterRequest` (`name` "1–100 chars, trimmed", `email` valid, ≤254, lower-cased, `password` 10–200 chars), `LoginRequest`, `UserResponse`; strict objects
- [X] T029 Implement `backend/src/auth/sessionStore.ts`: create session with 32-byte random base64url id, 7-day expiry, sliding renewal on use, delete on logout, purge expired
- [X] T030 Implement `backend/src/auth/service.ts` (bcryptjs cost 12, case-insensitive email uniqueness) and `backend/src/auth/routes.ts` for register/login/logout/me with `express-rate-limit` 10 requests/min keyed by IP+email on login; cookie `sid` HttpOnly, `SameSite=Lax`, `Secure` when `NODE_ENV=production`
- [X] T031 Implement `backend/src/middleware/requireAuth.ts` loading the session from cookie `sid`, rejecting missing/expired sessions and deactivated users with 401 `UNAUTHENTICATED`, and attaching `req.user`
- [X] T032 [P] Write failing contract tests `backend/tests/contract/users.test.ts` for `GET /api/users?q=` returning only active users matching name/email substring, paginated `{ items, total }`, never exposing email of other users beyond `UserRef` fields, 401 when signed out
- [X] T033 Implement `backend/src/users/routes.ts` (`GET /api/users`) so T032 passes
- [X] T034 Implement `backend/src/app.ts` (helmet, json body limit 100kb, cookie-parser, requestLogger, csrf, auth routes, `requireAuth` on all other `/api` routes, feature routers, 404 handler, errorHandler) and `backend/src/server.ts`; confirm T027 passes
- [X] T035 Create `backend/prisma/seed.ts` (wired to `npm run db:seed`) inserting users olivia@example.com, arjun@example.com, mei@example.com, sam@example.com (password `Password123!`), two meetings organized by Olivia with Arjun and Mei as participants, action items assigned to Arjun, and one issue; accept `--volume=N` to bulk-insert N additional action items across 200 meetings with mixed statuses and due dates

### Frontend shell

- [X] T036 [P] Create `frontend/src/styles/tokens.css` (colour tokens meeting WCAG AA contrast, spacing, status/severity colours) and `frontend/src/styles/global.css` (visible `:focus-visible` outline, layout usable from 360 px with no horizontal scroll)
- [X] T037 [P] Implement `frontend/src/api/client.ts`: `apiFetch` with `credentials: 'include'`, header `X-Requested-With: fetch`, JSON parsing, and throwing a typed `ApiError { status, code, message, details }`; `frontend/src/api/queryClient.ts` (TanStack Query, no retry on 4xx)
- [X] T038 [P] Implement shared UI components with co-located tests in `frontend/tests/components.test.tsx` written first: `frontend/src/components/FormField.tsx` (label bound to input, error text with `aria-live="polite"`), `ConfirmDialog.tsx` (focus trap, Esc closes), `StatusBadge.tsx` (text label + colour, never colour alone), `Breadcrumb.tsx` (`nav aria-label="Breadcrumb"`), `EmptyState.tsx` (message + optional "Clear filters" button), `ConflictBanner.tsx` (shows "This item was changed by someone else" with latest values)
- [X] T039 Write failing component tests `frontend/tests/auth.test.tsx`: Register page validates fields with the shared `RegisterRequest` schema and shows server `EMAIL_TAKEN` error; Login page shows a generic error on 401 and redirects to the originally requested URL on success; `ProtectedRoute` redirects signed-out users to `/login`
- [X] T040 Implement `frontend/src/auth/AuthContext.tsx` (uses `/api/auth/me`), `frontend/src/auth/ProtectedRoute.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx` so T039 passes
- [X] T041 Implement `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/routes.tsx` (all routes from contracts/ui-routes.md, pages stubbed as placeholders), and `frontend/src/components/Layout.tsx` (skip link, nav: My work, Meetings, Action items, Issues, Deleted items; Sign out)

**Checkpoint**: `npm run check` passes; a user can register, sign in, and sign out in the browser.

---

## Phase 3: User Story 1 - Record a Meeting and Its Action Items (Priority: P1) 🎯 MVP

**Goal**: Organizer records a meeting (description, date, participants) and creates action items
(assignee, start date, due date, status, comments) linked to it.

**Independent Test**: Create a meeting with participants, add three action items, open the meeting
and see all three; each action item shows its originating meeting (quickstart V1).

### Tests for User Story 1 (write first, confirm they FAIL) ⚠️

- [X] T042 [P] [US1] Contract tests `backend/tests/contract/meetings.test.ts`: `POST /api/meetings` → 201 with caller as organizer; `description` "required, 1–2000 chars"; `meetingDate` required valid `YYYY-MM-DD` (future dates allowed); `participants` minItems 1 with exactly one of `userId`/`externalName` per entry (`externalName` 1–100 chars), duplicate userId → 400, unknown userId → 400; writes a `CREATE` history row; `GET /api/meetings` returns newest `meetingDate` first with `participantCount`, `actionItemCount`, `openIssueCount`; `GET /api/meetings/:id` includes participants and `permissions`; `PATCH /api/meetings/:id` by organizer updates fields and writes one history row per changed field, by anyone else → 403, stale `version` → 409 `VERSION_CONFLICT` with `details.current`; unknown id → 404
- [X] T043 [P] [US1] Contract tests `backend/tests/contract/actionItems.create.test.ts`: `POST /api/meetings/:id/action-items` by organizer → 201 with `status` `OPEN` by default and `meeting` ref; by non-organizer → 403; `description` "1–2000 chars"; `assigneeId` "must reference an active registered user" (deactivated or unknown → 400); `dueDate` earlier than `startDate` → 400 with field detail on `dueDate`; equal dates allowed; meeting not found → 404; `GET /api/action-items/:id` returns meeting ref, `isOverdue`, `openIssueCount`, `permissions`, and comments oldest-first
- [X] T044 [P] [US1] Contract tests `backend/tests/contract/comments.test.ts`: `POST /api/action-items/:id/comments` by organizer, assignee, or registered participant → 201 with author and `createdAt`; by other signed-in user → 403; `body` "required, 1–1000 chars"; comments returned in chronological order on the action item detail
- [X] T045 [P] [US1] Component tests `frontend/tests/us1.test.tsx`: `MeetingForm` requires description, date, ≥1 participant and supports adding an external name; `ActionItemForm` blocks submit when due date is before start date and shows the message on the due date field; `CommentList` renders author, time, oldest first
- [X] T046 [P] [US1] Playwright spec `e2e/us1-record-meeting.spec.ts` implementing quickstart V1 steps 1–5, including `expectNoA11yViolations` on `/meetings/new`, `/meetings/:id`, `/action-items/:id`

### Implementation for User Story 1

- [X] T047 [P] [US1] Create `shared/src/schemas/meeting.ts` (`MeetingCreate`, `MeetingUpdate` with required `version`, `ParticipantInput` with exactly-one-of refinement, response types) per openapi.yaml
- [X] T048 [P] [US1] Create `shared/src/schemas/actionItem.ts` (`ActionItemCreate` with refinement "dueDate MUST be ≥ startDate" reported on `dueDate`, `ActionItem`, `ActionItemDetail` response types) and `shared/src/schemas/comment.ts` (`CommentCreate` body "1–1000 chars")
- [X] T049 [US1] Implement `backend/src/meetings/service.ts`: `createMeeting` (meeting + participants + history in one transaction), `getMeeting` (with participants, counts, `permissionsFor`), `listMeetings` (newest first, paginated, `notDeleted`), `updateMeeting` (organizer-only via policy, optimistic lock `updateMany where { id, version }` then `version + 1`, participant replacement, per-field history)
- [X] T050 [US1] Implement `backend/src/meetings/routes.ts` (`GET/POST /api/meetings`, `GET/PATCH /api/meetings/:meetingId`) and mount in `backend/src/app.ts` so T042 passes
- [X] T051 [US1] Implement `backend/src/actionItems/service.ts` `createActionItem` (organizer-only, active-assignee check, date-order check, history `CREATE`) and `getActionItemDetail` (meeting ref, `isOverdue` via `resolveToday`, `openIssueCount` counting non-deleted issues with status ≠ `RESOLVED`, `needsReassignment` when assignee is deactivated, comments, `permissions`)
- [X] T052 [US1] Implement `backend/src/actionItems/routes.ts` (`POST /api/meetings/:meetingId/action-items`, `GET /api/action-items/:actionItemId`) and mount it so T043 passes
- [X] T053 [US1] Implement `backend/src/comments/service.ts` and `backend/src/comments/routes.ts` (`POST /api/action-items/:actionItemId/comments`, permission via `canComment`) so T044 passes
- [X] T054 [P] [US1] Implement API hooks `frontend/src/api/meetings.ts` (list, get, create, update), `frontend/src/api/actionItems.ts` (create, get), `frontend/src/api/comments.ts`, `frontend/src/api/users.ts` (search)
- [X] T055 [P] [US1] Implement `frontend/src/components/ParticipantPicker.tsx` (accessible combobox searching `/api/users` plus "Add external participant" text entry), `frontend/src/components/MeetingForm.tsx`, `frontend/src/components/ActionItemForm.tsx`, `frontend/src/components/CommentList.tsx` with `CommentForm` so T045 passes
- [X] T056 [US1] Implement pages `frontend/src/pages/MeetingNewPage.tsx`, `frontend/src/pages/MeetingEditPage.tsx` (organizer only; shows `ConflictBanner` on 409), `frontend/src/pages/MeetingsListPage.tsx` (unfiltered list for now), `frontend/src/pages/MeetingDetailPage.tsx` (header, participants, action items list, "Add action item" for organizer), `frontend/src/pages/ActionItemDetailPage.tsx` (Breadcrumb Meeting › Action item, details, comments) and wire them in `frontend/src/routes.tsx` so T046 passes

**Checkpoint**: User Story 1 is fully functional and demoable on its own (MVP).

---

## Phase 4: User Story 2 - Assignee Updates Action Item Progress (Priority: P2)

**Goal**: Assignee (or organizer) updates status and dates with full change history; only the
organizer reassigns; concurrent edits are detected.

**Independent Test**: As an assignee, change status Open → In Progress and move the due date; the
item shows new values and the History tab lists both changes with name and time (quickstart V2).

### Tests for User Story 2 (write first, confirm they FAIL) ⚠️

- [X] T057 [P] [US2] Contract tests `backend/tests/contract/actionItems.update.test.ts`: `PATCH /api/action-items/:id` by assignee or organizer changes `status` (any of `OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`), `startDate`, `dueDate`; by participant or other user → 403; `assigneeId` change by assignee → 403, by organizer → 200 and new assignee immediately gains edit rights while the previous one gets 403; `description` change only by organizer; a partial update that makes `dueDate < startDate` (combining stored and new values) → 400; reopening `DONE`/`CANCELLED` → `OPEN` or `IN_PROGRESS` allowed; stale `version` → 409 `VERSION_CONFLICT` with `details.current`; each changed field writes one history row with old value, new value, actor, timestamp
- [X] T058 [P] [US2] Contract tests `backend/tests/contract/history.test.ts`: `GET /api/history/{meeting|action-item|issue}/:id` returns entries oldest first with `action`, `field`, `oldValue`, `newValue`, `actor`, `createdAt`; invalid `entityType` → 400; signed-out → 401
- [X] T059 [P] [US2] Contract tests `backend/tests/contract/myItems.test.ts`: `GET /api/action-items?assigneeId=me&status=OPEN,IN_PROGRESS,BLOCKED` returns only the caller's items, earliest `dueDate` first, with `isOverdue` computed from the `today` parameter
- [X] T060 [P] [US2] Component tests `frontend/tests/us2.test.tsx`: `ActionItemEditor` shows status/date controls only when `permissions.canEdit`, shows reassign only when `permissions.canReassign`, renders `ConflictBanner` with latest values on 409; `HistoryTab` lists entries oldest first
- [X] T061 [P] [US2] Playwright spec `e2e/us2-update-progress.spec.ts` implementing quickstart V2 steps 1–4 (assignee update + history, non-participant read-only, participant comment-only, two-tab conflict)

### Implementation for User Story 2

- [X] T062 [P] [US2] Add `ActionItemUpdate` to `shared/src/schemas/actionItem.ts` (required `version`, optional `description`, `assigneeId`, `startDate`, `dueDate`, `status`, `confirmOpenIssues`; strict) and `HistoryEntry` type to `shared/src/schemas/history.ts`
- [X] T063 [US2] Implement `updateActionItem` in `backend/src/actionItems/service.ts`: field-level permission checks (`canUpdateActionItem` for status/dates, `canReassign` for `assigneeId`, organizer-only `description`), merged date-order validation, active-assignee check on reassignment, optimistic lock, per-field history in the same transaction
- [X] T064 [US2] Add `PATCH /api/action-items/:actionItemId` and a minimal `GET /api/action-items` supporting `assigneeId` (incl. `me`), `status` (comma list), `today`, and pagination to `backend/src/actionItems/routes.ts` so T057 and T059 pass
- [X] T065 [US2] Implement `backend/src/history/routes.ts` (`GET /api/history/:entityType/:entityId`, mapping `meeting`/`action-item`/`issue` to stored entity types) and mount it so T058 passes
- [X] T066 [P] [US2] Implement `frontend/src/components/ActionItemEditor.tsx` (status select with all five statuses, start/due date inputs, reassign picker for organizer, 409 handling via `ConflictBanner`) and `frontend/src/components/HistoryTab.tsx`; add `update`, `listMine` to `frontend/src/api/actionItems.ts` and `frontend/src/api/history.ts` so T060 passes
- [X] T067 [US2] Add the editor and a History tab to `frontend/src/pages/ActionItemDetailPage.tsx`, and implement `frontend/src/pages/HomePage.tsx` ("My work": my open/in-progress/blocked items, overdue first with "Overdue" label) so T061 passes

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Raise and Manage Issues on an Action Item (Priority: P3)

**Goal**: Assignee, organizer, or registered participant raises issues on an action item; assignee
or organizer manages them; action items can be manually set to Blocked; marking Done with open
issues requires confirmation.

**Independent Test**: Raise an issue on an action item, update it, mark it Resolved; it appears
under the action item with correct status and history (quickstart V3).

### Tests for User Story 3 (write first, confirm they FAIL) ⚠️

- [X] T068 [P] [US3] Contract tests `backend/tests/contract/issues.test.ts`: `POST /api/action-items/:id/issues` by assignee, organizer, or registered participant → 201 with `status` `OPEN`, `raisedBy` = caller; by other user → 403; `title` "1–200 chars", `description` "1–2000 chars", `severity` one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; `PATCH /api/issues/:id` by assignee of the parent item or organizer → 200 with per-field history; by the raising participant (not assignee/organizer) → 403; status transitions `OPEN ⇄ IN_PROGRESS → RESOLVED` and `RESOLVED → OPEN` allowed, `RESOLVED → IN_PROGRESS` → 400; stale `version` → 409; `GET /api/issues/:id` includes `actionItem` (id, description, assignee) and `meeting` refs and `permissions`
- [X] T069 [P] [US3] Contract tests `backend/tests/contract/actionItems.issues.test.ts`: `openIssueCount` on action item detail and list counts only non-resolved, non-deleted issues; `PATCH` status `DONE` while open issues exist → 409 `OPEN_ISSUES_CONFIRMATION_REQUIRED`, with `confirmOpenIssues: true` → 200; setting `BLOCKED` succeeds; resolving all issues leaves the item `BLOCKED` (never changed automatically)
- [X] T070 [P] [US3] Unit tests `backend/tests/unit/issueTransitions.test.ts` for `canTransitionIssue(from, to)` covering every pair of `OPEN`, `IN_PROGRESS`, `RESOLVED`
- [X] T071 [P] [US3] Component tests `frontend/tests/us3.test.tsx`: `IssueForm` validates title/description/severity; `IssueList` shows severity and status as text badges; marking Done with open issues opens `ConfirmDialog` and resends with `confirmOpenIssues: true`
- [X] T072 [P] [US3] Playwright spec `e2e/us3-issues.spec.ts` implementing quickstart V3 steps 1–4

### Implementation for User Story 3

- [X] T073 [P] [US3] Create `shared/src/schemas/issue.ts` (`IssueCreate` title "1–200 chars", description "1–2000 chars", severity enum; `IssueUpdate` with required `version`; `Issue` response type)
- [X] T074 [P] [US3] Implement `backend/src/issues/transitions.ts` (`canTransitionIssue`) so T070 passes
- [X] T075 [US3] Implement `backend/src/issues/service.ts`: `createIssue` (`canRaiseIssue`, history `CREATE`), `getIssue` (parent refs, permissions), `updateIssue` (`canEditIssue`, transition check, optimistic lock, per-field history)
- [X] T076 [US3] Implement `backend/src/issues/routes.ts` (`POST /api/action-items/:actionItemId/issues`, `GET/PATCH /api/issues/:issueId`) and mount it so T068 passes
- [X] T077 [US3] Extend `updateActionItem` in `backend/src/actionItems/service.ts` to reject `DONE` with open issues unless `confirmOpenIssues === true` (409 `OPEN_ISSUES_CONFIRMATION_REQUIRED` with `details.openIssueCount`), and include issues in `getActionItemDetail`, so T069 passes
- [X] T078 [P] [US3] Implement `frontend/src/api/issues.ts`, `frontend/src/components/IssueForm.tsx`, `frontend/src/components/IssueList.tsx`, and the Done-confirmation flow in `frontend/src/components/ActionItemEditor.tsx` so T071 passes
- [X] T079 [US3] Add the issues section ("N open issues" indicator, Raise issue button when `permissions.canRaiseIssue`) to `frontend/src/pages/ActionItemDetailPage.tsx` and implement `frontend/src/pages/IssueDetailPage.tsx` (Breadcrumb Meeting › Action item › Issue, edit form, History tab) so T072 passes

**Checkpoint**: User Stories 1–3 work independently.

---

## Phase 6: User Story 4 - Filter Meetings, Action Items and Issues (Priority: P4)

**Goal**: Combinable filters on all three lists, "my items/issues" views, overdue highlighting, and
CSV export of filtered action items and issues.

**Independent Test**: With seeded data, filter action items by assignee + Open + overdue and see only
matching rows; clear filters to see all; export CSV matching the on-screen rows (quickstart V4).

### Tests for User Story 4 (write first, confirm they FAIL) ⚠️

- [X] T080 [P] [US4] Contract tests `backend/tests/contract/filters.meetings.test.ts`: `GET /api/meetings` with `from`/`to` (inclusive), `participantId`, `q` (case-insensitive substring of description), combinations, pagination totals, `from > to` → 400
- [X] T081 [P] [US4] Contract tests `backend/tests/contract/filters.actionItems.test.ts`: `GET /api/action-items` with `assigneeId` (id or `me`), `status` (comma list), `meetingId`, `dueFrom`/`dueTo`, `overdue=true` (due before `today`, status not `DONE`/`CANCELLED`), `q`; combined filters AND together; sorted earliest `dueDate` first; `pageSize` > 200 → 400
- [X] T082 [P] [US4] Contract tests `backend/tests/contract/filters.issues.test.ts`: `GET /api/issues` with `status`, `severity` (comma lists), `assigneeId` (assignee of parent action item, id or `me`), `actionItemId`; sorted by severity `CRITICAL` → `LOW` then newest first
- [X] T083 [P] [US4] Unit tests `backend/tests/unit/csv.test.ts` for `toCsv(headers, rows)`: UTF-8 BOM prefix, CRLF line endings, quoting of `,` `"` CR LF with doubled quotes, header row when no rows, formula-injection guard prefixing `'` to values starting with `=`, `+`, `-`, `@`, tab, or CR
- [X] T084 [P] [US4] Contract tests `backend/tests/contract/export.test.ts`: `GET /api/action-items/export.csv` and `GET /api/issues/export.csv` return `text/csv; charset=utf-8` with `Content-Disposition` filename `action-items-YYYYMMDD.csv` / `issues-YYYYMMDD.csv`; columns and order exactly per contracts/csv-export.md; row count equals the list endpoint `total` for the same filters (pagination ignored); same sort order as the list
- [X] T085 [P] [US4] Performance test `backend/tests/integration/performance.test.ts`: after seeding 10,000 action items, each filtered list request and each CSV export completes in under 2 seconds (SC-004)
- [X] T086 [P] [US4] Component tests `frontend/tests/us4.test.tsx`: `FilterBar` writes filters to and reads them from the URL query string using API parameter names; "Clear filters" resets them; `EmptyState` shows when no results; Export CSV link carries the current filters
- [X] T087 [P] [US4] Playwright spec `e2e/us4-filter-export.spec.ts` implementing quickstart V4 steps 2–5 (uses the seed from T035 with a smaller volume for speed)

### Implementation for User Story 4

- [X] T088 [P] [US4] Create `shared/src/schemas/filters.ts`: `MeetingFilters`, `ActionItemFilters`, `IssueFilters` (comma-list parsing into enum arrays, `me` handling, date ranges with `from ≤ to`, pagination)
- [X] T089 [P] [US4] Implement `backend/src/lib/csv.ts` (`toCsv`) so T083 passes
- [X] T090 [US4] Add filtering to `listMeetings` in `backend/src/meetings/service.ts` and its route so T080 passes
- [X] T091 [US4] Implement full filtering in `listActionItems` in `backend/src/actionItems/service.ts` (shared `buildActionItemWhere(filters, user, today)`) and route so T081 passes
- [X] T092 [US4] Implement `listIssues` with `buildIssueWhere` in `backend/src/issues/service.ts` and `GET /api/issues` route so T082 passes
- [X] T093 [US4] Implement `backend/src/actionItems/csv.ts` and `backend/src/issues/csv.ts` reusing the `build…Where` functions and `toCsv`, plus `GET /api/action-items/export.csv` and `GET /api/issues/export.csv` routes (registered before `/:id` routes), so T084 and T085 pass
- [X] T094 [P] [US4] Implement `frontend/src/components/FilterBar.tsx` (URL-synced filter state via `useSearchParams`, labelled controls, Clear filters) and filter definitions for meetings, action items, and issues so T086 passes
- [X] T095 [US4] Add filters to `frontend/src/pages/MeetingsListPage.tsx`; implement `frontend/src/pages/ActionItemsListPage.tsx` (overdue rows labelled "Overdue", Export CSV link) and `frontend/src/pages/IssuesListPage.tsx` (Export CSV link); add "My open issues" to `frontend/src/pages/HomePage.tsx` so T087 passes

**Checkpoint**: User Stories 1–4 work independently.

---

## Phase 7: User Story 5 - View End-to-End Traceability (Priority: P5)

**Goal**: From any meeting, action item, or issue, see and navigate the full meeting → action items
→ issues chain, with summary counts.

**Independent Test**: Open an issue, navigate to its action item and meeting in one click each;
the meeting page shows a tree of all items and issues with summary counts (quickstart V5).

### Tests for User Story 5 (write first, confirm they FAIL) ⚠️

- [X] T096 [P] [US5] Contract tests `backend/tests/contract/traceability.test.ts`: `GET /api/meetings/:id/traceability` returns the meeting, every non-deleted action item with status, assignee, due date, `isOverdue`, and its non-deleted issues; `summary.actionItemsByStatus` has a count for each of the five statuses, `overdueCount`, `openIssueCount`; unknown meeting → 404
- [X] T097 [P] [US5] Component tests `frontend/tests/us5.test.tsx`: `TraceabilityTree` renders meeting → items → issues as a nested list with accessible expand/collapse and links; `SummaryCounts` shows counts as text
- [X] T098 [P] [US5] Playwright spec `e2e/us5-traceability.spec.ts` implementing quickstart V5 steps 1–2 (issue → action item → meeting in ≤2 clicks; full tree on one screen)

### Implementation for User Story 5

- [X] T099 [US5] Implement `backend/src/meetings/traceability.ts` (single query loading items + issues, summary aggregation) and `GET /api/meetings/:meetingId/traceability` in `backend/src/meetings/routes.ts` so T096 passes
- [X] T100 [P] [US5] Implement `frontend/src/components/TraceabilityTree.tsx` and `frontend/src/components/SummaryCounts.tsx` and the `useTraceability` hook in `frontend/src/api/meetings.ts` so T097 passes
- [X] T101 [US5] Replace the plain action items list on `frontend/src/pages/MeetingDetailPage.tsx` with `SummaryCounts` + `TraceabilityTree`, and verify breadcrumbs on `ActionItemDetailPage` and `IssueDetailPage` link to parents, so T098 passes

**Checkpoint**: All five user stories work independently.

---

## Phase 8: Soft Delete & Restore (Cross-Cutting: FR-025, FR-028)

**Purpose**: Organizer-only confirmed soft delete with batch cascade and restore, excluded from all
views and exports

### Tests (write first, confirm they FAIL) ⚠️

- [X] T102 [P] Integration tests `backend/tests/integration/softDelete.test.ts`: `DELETE /api/meetings/:id?version=` by organizer soft-deletes the meeting and all its not-yet-deleted action items and issues with one shared `deletionBatchId`; non-organizer → 403; stale version → 409; afterwards the records are absent from `GET /api/meetings`, `/api/action-items`, `/api/issues`, traceability, both CSV exports, and `GET` by id returns 404; `DELETE` on an action item cascades to its issues; an issue deleted earlier on its own stays deleted when its meeting's batch is restored; `GET /api/meetings/:id/deletion-impact` returns correct counts; history has `DELETE` and `RESTORE` rows
- [X] T103 [P] Contract tests `backend/tests/contract/deleted.test.ts`: `GET /api/deleted` lists only records from meetings organized by the caller, grouped by batch with `dependentCount`; `POST /api/deleted/{type}/:id/restore` by organizer restores the whole batch; by others → 403; restoring an action item whose meeting is still deleted → 409 `PARENT_DELETED`
- [X] T104 [P] Playwright spec `e2e/deletion.spec.ts` implementing quickstart V6 steps 1–3

### Implementation

- [X] T105 Implement `backend/src/softDelete/service.ts`: `softDelete(tx, entityType, id, actor)` (generates batch id, marks record + non-deleted descendants, writes `DELETE` history) and `restore(tx, entityType, id, actor)` (parent-deleted check, clears the whole batch, writes `RESTORE` history)
- [X] T106 Add `DELETE` routes to `backend/src/meetings/routes.ts`, `backend/src/actionItems/routes.ts`, `backend/src/issues/routes.ts` (organizer only via `canDelete`, `version` query param) and `GET /api/meetings/:meetingId/deletion-impact`, so T102 passes
- [X] T107 Implement `backend/src/deleted/routes.ts` (`GET /api/deleted`, `POST /api/deleted/:entityType/:entityId/restore`) and mount it so T103 passes
- [X] T108 [P] Implement `frontend/src/components/DeleteButton.tsx` (loads deletion impact, shows `ConfirmDialog` listing affected action items and issues) and add it to meeting, action item, and issue pages when `permissions.canDelete`
- [X] T109 Implement `frontend/src/pages/DeletedPage.tsx` (grouped deleted records, Restore button, `PARENT_DELETED` message) and `frontend/src/api/deleted.ts` so T104 passes

**Checkpoint**: Deletion is confirmed, reversible, audited, and invisible everywhere else.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, security, documentation, and final validation

- [X] T110 [P] Playwright spec `e2e/a11y.spec.ts`: visit every route from contracts/ui-routes.md signed in as organizer and run `expectNoA11yViolations`; repeat on the 360 px project asserting `document.documentElement.scrollWidth <= 360`
- [X] T111 [P] Playwright spec `e2e/keyboard.spec.ts`: complete quickstart V1 using only the keyboard, asserting a visible focus indicator on each focused control
- [X] T112 [P] Unit test `backend/tests/unit/logging.test.ts` asserting log output for register, login, meeting create, and comment create contains no password, cookie, description, or comment body
- [X] T113 [P] Security pass in `backend/src/app.ts`: verify helmet headers (CSP `default-src 'self'`), body size limit, `Secure` cookie in production, and that every router except auth sits behind `requireAuth`; add a test in `backend/tests/contract/security.test.ts` that enumerates all routes from openapi.yaml and asserts 401 without a session
- [X] T114 [P] Write `README.md` at repository root: prerequisites, setup, scripts, seeded accounts, and links to `specs/001-meeting-action-tracker/`
- [X] T115 Run `npm run check` and `npm run test:e2e`; fix any failures; then run quickstart.md scenarios V1–V7 manually and record results in `specs/001-meeting-action-tracker/checklists/quickstart-validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational; uses the action item created by US1 endpoints (T051–T052) for its tests' fixtures
- **US3 (Phase 5)**: depends on Foundational and US1 (issues hang off action items); T077 extends US2's `updateActionItem` (T063)
- **US4 (Phase 6)**: depends on US1; T092 depends on US3's issue service (T075)
- **US5 (Phase 7)**: depends on US1 and US3 (tree includes issues)
- **Soft Delete (Phase 8)**: depends on US1–US3 (needs all three entity routes); T102 exclusion checks also depend on US4 lists/exports and US5 traceability
- **Polish (Phase 9)**: depends on all previous phases

### Story completion order

```text
Setup → Foundational → US1 (MVP) → US2 → US3 → { US4, US5 } → Soft Delete → Polish
```

US4 and US5 can run in parallel once US3 is complete.

### Within each phase

- Test tasks first; run them and confirm they FAIL (constitution Principle II)
- Shared schemas → backend services → backend routes → frontend API hooks/components → pages
- A phase is complete only when all its tests pass and its checkpoint is demonstrated

### Parallel Opportunities

- Setup: T003–T007 in parallel after T001–T002
- Foundational: T011–T012 together; T014–T017 together; T019, T020, T023, T024, T025 together after T018; T027, T028, T032 together; T036–T038 together
- Each story: all test tasks marked [P] together; shared schema and frontend component tasks marked [P] alongside backend work
- After US3: US4 and US5 by different developers

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together (they must fail first):
Task: "Contract tests backend/tests/contract/meetings.test.ts"           # T042
Task: "Contract tests backend/tests/contract/actionItems.create.test.ts" # T043
Task: "Contract tests backend/tests/contract/comments.test.ts"           # T044
Task: "Component tests frontend/tests/us1.test.tsx"                      # T045
Task: "Playwright spec e2e/us1-record-meeting.spec.ts"                   # T046

# Then shared schemas in parallel:
Task: "shared/src/schemas/meeting.ts"                                    # T047
Task: "shared/src/schemas/actionItem.ts + comment.ts"                    # T048

# Frontend hooks/components in parallel with backend services:
Task: "frontend/src/api/*.ts hooks"                                      # T054
Task: "ParticipantPicker, MeetingForm, ActionItemForm, CommentList"      # T055
```

## Parallel Example: User Story 4

```bash
Task: "backend/tests/contract/filters.meetings.test.ts"     # T080
Task: "backend/tests/contract/filters.actionItems.test.ts"  # T081
Task: "backend/tests/contract/filters.issues.test.ts"       # T082
Task: "backend/tests/unit/csv.test.ts"                      # T083
Task: "backend/tests/contract/export.test.ts"               # T084
Task: "backend/tests/integration/performance.test.ts"       # T085
Task: "frontend/tests/us4.test.tsx"                         # T086
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart V1 and `npm run check`
5. Demo: meetings with participants, action items, comments

### Incremental Delivery

1. Setup + Foundational → sign-in works
2. + US1 → record meetings and action items (MVP)
3. + US2 → assignees keep items current, full history
4. + US3 → issues, Blocked status, Done confirmation
5. + US4 → filters and CSV export; + US5 → traceability tree (parallel)
6. + Soft delete & restore → safe cleanup
7. Polish → accessibility, security, docs, full quickstart validation

### Parallel Team Strategy

1. Whole team: Setup + Foundational
2. Developer A: US1 → US3; Developer B: frontend shell polish then US2 (after US1 endpoints exist)
3. After US3: Developer A → US4, Developer B → US5
4. Together: Soft delete, Polish

---

## Notes

- [P] tasks touch different files and have no dependency on incomplete tasks
- [USn] labels map tasks to spec.md user stories for traceability
- Verify each test fails before implementing; commit after each task or logical group, referencing the task ID
- Stop at any checkpoint to validate a story on its own

---

## Phase 10: Convergence

- [X] T116 CRITICAL: Run `npm run format` to fix the 71 files flagged by `prettier --check .`, add a root script `format:check` (`prettier --check .`), and add it to `npm run check` so formatting is enforced per Constitution, Development Workflow & Quality Gates (contradicts)
- [X] T117 CRITICAL: Document `GET /api/health` (public, no session, returns `{ status: 'ok' }`) in `specs/001-meeting-action-tracker/contracts/openapi.yaml` and add a contract test in `backend/tests/contract/security.test.ts` asserting 200 without a session, per Constitution, Technology & Data Constraints (API contract kept in sync with code) (contradicts)
- [X] T118 Make the delete confirmation in `frontend/src/components/DeleteButton.tsx` name every affected issue: list issue titles for an action item delete, and for a meeting delete list each action item's issues (extend `GET /api/meetings/{meetingId}/deletion-impact` and openapi.yaml with issue titles); write failing tests in `frontend/tests/deletion.test.tsx` and `backend/tests/contract/deleted.test.ts` first, per FR-025 (partial)
- [X] T119 Align `frontend/package.json` with the plan (React 18, `react-dom` 18, `react-router-dom`) and update imports from `react-router`, or record the React 19 / React Router 7 choice with rationale in plan.md via an approved amendment; `npm run check` and `npm run test:e2e` must stay green, per plan: Primary Dependencies (contradicts)
- [X] T120 Add a way to remove a user, `npm run user:deactivate -w backend -- <email>` (`backend/scripts/deactivate-user.ts` setting `deactivatedAt` and deleting the user's sessions), with an integration test in `backend/tests/integration/deactivation.test.ts` asserting the user can no longer sign in, keeps their name in history, and their open action items report `needsReassignment: true`, per spec edge case "participant or assignee is removed" (partial)
