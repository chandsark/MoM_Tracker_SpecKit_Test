# Quickstart: Validate the Tailwind UI Refresh

**Feature**: [spec.md](./spec.md) | **Design system**: [contracts/design-system.md](./contracts/design-system.md)

## Prerequisites

- Node ≥ 22, dependencies installed: `npm install`
- Database migrated and seeded: `npm run db:migrate && npm run db:seed`
- Playwright browsers: `npx playwright install chromium`

## V1 — Automated gate (SC-002)

```bash
npm run check        # lint, format, typecheck, unit/component tests, API lint, licenses
npm run test:e2e     # Playwright: all flows + axe (desktop, 360px, 320px)
```

**Expected**: everything green. No existing behavior test was edited to accommodate styling,
except locator changes listed in the PR description (expected: none).

## V2 — Accessibility in both schemes (SC-003, FR-015)

`e2e/a11y.spec.ts` runs axe on every route in light and dark (`colorScheme: 'dark'`).

**Expected**: zero WCAG 2.1 AA violations on every route in both schemes.

## V3 — Mobile layout (SC-004, US3, FR-005, FR-017)

Covered by the `mobile-320` and `mobile-360` Playwright projects. Manual spot-check:

1. `npm run dev`, open http://localhost:5173 in a browser at 375×812 (device toolbar).
2. Sign in as the seeded organizer.
3. Open the **Menu** button → navigate to Meetings → menu closes.
4. Create a meeting, add an action item, change its status, filter action items by "Me".

**Expected**: no horizontal page scroll anywhere; menu operable by keyboard (Enter opens, Escape
closes and returns focus); tables scroll inside their own container; every control ≥ 44px tall.

## V4 — Consistency walkthrough (SC-001, US1)

Visit every route in [001 ui-routes.md](../../001-meeting-action-tracker/contracts/ui-routes.md)
plus an unknown URL (404), in light then dark OS theme.

**Expected**: same header, card surfaces, button variants, badge colors on every screen; no
unstyled or old-styled element; `frontend/src/styles/global.css` and `tokens.css` no longer exist.

## V5 — Feedback states (US2, FR-011..FR-013)

1. Throttle network to "Slow 3G" and open Action items → skeleton rows with "Loading…" status.
2. Filter action items to a combination with no results → empty state with **Clear filters**.
3. Submit the New meeting form empty → inline errors, focus on the first invalid field.
4. Save an action item status change → "Action item updated" toast, auto-dismisses after ~4s.
5. Delete an action item → styled dialog, red destructive button, Cancel returns focus.

## V6 — Motion and zoom (edge cases, FR-018)

1. Enable OS "reduce motion" → no pulsing skeletons or sliding toasts.
2. Browser zoom 200% on Meeting detail → content reflows, nothing overlaps or is cut off.

## V7 — User review (SC-005, SC-006)

Run a 15-minute session with ≥ 5 users comparing `master` and this branch: rate attractiveness and
ease of use (1–5), and time first-attempt discovery of each core flow.

**Expected**: ≥ 80% prefer the new UI; ≥ 90% of core-flow discoveries within 3 interactions.
