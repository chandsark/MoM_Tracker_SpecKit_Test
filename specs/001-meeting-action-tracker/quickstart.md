# Quickstart & Validation Guide: Meeting, Action Item & Issue Tracking

**Feature**: `001-meeting-action-tracker`

This guide shows how to run the app and prove each user story works end to end. API shapes are in
[contracts/openapi.yaml](./contracts/openapi.yaml); entities and permission rules are in
[data-model.md](./data-model.md).

## Prerequisites

- Node.js 22 LTS and npm 10+
- No database server needed (SQLite file is created automatically)
- For end-to-end tests: Playwright browsers (`npx playwright install chromium`)

## Setup and run

```bash
npm install                      # installs all workspaces (backend, frontend, shared)
cp backend/.env.example backend/.env   # DATABASE_URL=file:./dev.db, SESSION_SECRET=<random>
npm run db:migrate               # prisma migrate dev — creates backend/prisma/dev.db
npm run db:seed                  # optional: 3 users, 2 meetings, sample items and issues
npm run dev                      # API on http://localhost:3000, web on http://localhost:5173
```

Seeded users (password `Password123!` for all): `olivia@example.com` (organizer),
`arjun@example.com` (assignee), `mei@example.com` (participant), `sam@example.com` (not a
participant).

## Quality gate

```bash
npm run check        # lint + typecheck + all unit, contract, and integration tests
npm run test:e2e     # Playwright end-to-end + axe accessibility checks
```

Both MUST pass before merge (constitution, Development Workflow & Quality Gates).

## Validation scenarios

Each scenario maps to a user story and has a matching Playwright spec under `e2e/`.

### V1 — Record a meeting and its action items (US1)

1. Register a new user, then click **New meeting**.
2. Enter a description, today's date, and two participants (one registered user, one external
   name); save. **Expect**: the meeting appears at the top of `/meetings`.
3. On the meeting page, add three action items with assignee, start date, due date.
   **Expect**: all three listed under the meeting; each item's page shows a breadcrumb to the
   meeting.
4. Try saving an item whose due date is before its start date.
   **Expect**: the save is blocked with a message about the date order.
5. Add a comment to an item. **Expect**: shown with your name and time.

### V2 — Assignee updates progress (US2)

1. Sign in as `arjun@example.com`; open an item from **My work**; change status to In Progress
   and move the due date. **Expect**: the values update; the History tab shows two entries with
   Arjun's name, old and new values.
2. Sign in as `sam@example.com` and open the same item. **Expect**: no edit controls; a direct
   `PATCH /api/action-items/{id}` returns 403.
3. Sign in as `mei@example.com` (participant). **Expect**: can add a comment, cannot change status.
4. Open the same item in two browser tabs as Arjun, save in tab 1, then save in tab 2.
   **Expect**: tab 2 shows the "changed by someone else" message with the latest values.

### V3 — Issues and Blocked status (US3)

1. As Mei (participant), raise a High-severity issue on Arjun's item. **Expect**: issue saved with
   status Open and Mei as raiser; the item shows "1 open issue".
2. As Arjun, set the item to **Blocked**. **Expect**: Blocked shown in lists and filters.
3. As Arjun, resolve the issue. **Expect**: issue Resolved; item stays Blocked until Arjun
   changes it.
4. Raise another issue, then try to mark the item Done. **Expect**: a confirmation warning about
   open issues; confirming sets Done.

### V4 — Filtering and CSV export (US4)

1. Run `npm run db:seed -- --volume=10000` to generate 10,000 action items.
2. On `/action-items`, filter assignee = Arjun, status = Open, overdue. **Expect**: only matching
   rows, overdue rows labelled "Overdue"; results appear in under 2 seconds (SC-004).
3. Click **Export CSV**. **Expect**: the row count matches the on-screen total; columns follow
   [contracts/csv-export.md](./contracts/csv-export.md); meeting columns are filled in.
4. Apply a filter with no matches. **Expect**: empty state with **Clear filters**.
5. Repeat on `/meetings` (date range, participant, keyword) and `/issues` (status, severity).

### V5 — End-to-end traceability (US5)

1. Open any issue. **Expect**: breadcrumb Meeting › Action item › Issue; each link opens its parent
   in one click (SC-003).
2. Open the meeting. **Expect**: summary counts by status, overdue count, open issue count, and a
   tree of every action item with its issues, all on one screen.

### V6 — Soft delete and restore (FR-025, FR-028)

1. As Olivia (organizer), delete a meeting that has action items and issues. **Expect**: the
   confirmation lists affected items and issues; after confirming, none of them appear in lists,
   filters, traceability, or CSV exports.
2. Open `/deleted`, restore the meeting. **Expect**: the meeting and everything deleted with it
   reappear; History shows DELETE and RESTORE entries.
3. As Arjun, try `DELETE /api/meetings/{id}`. **Expect**: 403.

### V7 — Accessibility and responsiveness (constitution IV)

1. `npm run test:e2e` runs axe on every route. **Expect**: zero WCAG 2.1 AA violations.
2. Resize to 360 px wide. **Expect**: no horizontal scrolling; all actions reachable.
3. Complete V1 with keyboard only. **Expect**: every control reachable with visible focus.
