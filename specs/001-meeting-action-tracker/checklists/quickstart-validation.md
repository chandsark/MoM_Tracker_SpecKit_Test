# Quickstart Validation: Meeting, Action Item & Issue Tracking

**Feature**: `001-meeting-action-tracker` · **Run date**: 2026-10-26 · **Task**: T115

## Quality gate

| Command | Result |
|---------|--------|
| `npm run check` | PASS — lint clean; typecheck clean; shared 15/15, backend 249/249 (26 files), frontend 46/46; OpenAPI valid (47 style warnings, 0 errors); licences all on the allow-list |
| `npm run test:e2e` | PASS — 14/14 (12 desktop, 2 at 360 px) |

## Scenarios (automated)

Each quickstart scenario was run through its Playwright spec against a fresh seeded `e2e.db`.

- [x] **V1** Record a meeting and its action items — `e2e/us1-record-meeting.spec.ts`
- [x] **V2** Assignee updates progress, permissions, version conflict — `e2e/us2-update-progress.spec.ts` (2 tests)
- [x] **V3** Issues and Blocked status, Done confirmation — `e2e/us3-issues.spec.ts`
- [x] **V4** Filtering and CSV export — `e2e/us4-filter-export.spec.ts` (3 tests); 10,000-item
  timing (SC-004, < 2 s) — `backend/tests/integration/performance.test.ts`
- [x] **V5** End-to-end traceability — `e2e/us5-traceability.spec.ts`
- [x] **V6** Soft delete and restore, 403 for non-organizer — `e2e/deletion.spec.ts`
- [x] **V7.1** Zero axe WCAG 2.1 AA violations on every route — `e2e/a11y.spec.ts` (desktop)
- [x] **V7.2** No horizontal scrolling at 360 px — `e2e/a11y.spec.ts` (mobile-360 project)
- [x] **V7.3** V1 completed by keyboard only with visible focus — `e2e/keyboard.spec.ts`

## Defects found and fixed during this run

1. **Date input lost its focus indicator** (WCAG 2.4.7). Tabbing out of the last segment of a
   native date input moves focus to Chromium's built-in calendar button, which showed no outline.
   Fixed in `frontend/src/styles/global.css` by outlining `input[type='date']:focus-within`.
2. **Keyboard spec assumed month/day/year entry.** Chromium takes the date-segment order from the
   OS regional settings, so on a day-first host the year was typed as `62026`. `typeDate` in
   `e2e/keyboard.spec.ts` now tries each segment order and verifies the value.
3. **Lint error** (`no-unexpected-multiline`) in `backend/tests/contract/security.test.ts`.

## Manual walkthrough (to be signed off by a person)

The scenarios above were verified by automation only. A hands-on pass in a real browser is still
open:

- [ ] V1–V6 walked through by hand with the seeded accounts
- [ ] V7 checked with a screen reader and at 360 px on a physical phone
