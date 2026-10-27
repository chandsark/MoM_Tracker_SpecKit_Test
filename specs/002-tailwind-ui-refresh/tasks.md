---
description: "Task list for the Tailwind UI Refresh"
---

# Tasks: Tailwind UI Refresh

**Input**: Design documents from `specs/002-tailwind-ui-refresh/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/design-system.md](./contracts/design-system.md),
[quickstart.md](./quickstart.md)

**Tests**: Included. The constitution (Principle II) makes TDD mandatory, and research R10 lists
the tests. Every test task MUST be written and observed failing before its implementation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3 from spec.md
- Paths are relative to the repository root (web app: `frontend/`, `e2e/`)

## Global rules for every task (read once)

- **No behavior change** (FR-003): do not alter routes, API calls, query keys, form schemas,
  permission checks, ARIA roles/names, or visible text that existing tests use as locators.
- Use only the tokens and primitives in `contracts/design-system.md` (`bg-surface`, `text-muted`,
  `btn btn-primary`, `card`, `input`, `badge badge-success`, …) plus Tailwind layout/spacing
  utilities. Do **not** use raw palette classes (`bg-blue-700`, `text-gray-500`) or `dark:`
  variants; dark mode comes from the tokens.
- Legacy class names from the deleted `global.css` (`row`, `stack`, `muted`, `field`, `field-hint`,
  `field-error` as a legacy rule, `card` as a legacy rule, `secondary`, `danger`, `link`, `button`,
  `plain-list`, `page-header`, `form-error`, `table-wrap`, `banner`, `badge-<value>`, `tree`,
  `summary`, `filters`, `tabs`, `dialog*`, `app-*`, `skip-link`, `visually-hidden`, `checkbox`)
  must be replaced. Only `empty-state` remains, as an e2e locator marker. `visually-hidden` becomes `sr-only`.
- Interactive controls must be at least 44px tall (`min-h-11`). Use `motion-safe:` for any transition.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Tailwind to the build without touching any screen yet.

- [X] T001 Add `tailwindcss@^4.3` and `@tailwindcss/vite@^4.3` to `devDependencies` in `frontend/package.json` and run `npm install` from the repo root (updates `package-lock.json`); confirm `npm run lint:licenses` still passes
- [X] T002 Register the plugin in `frontend/vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'` and `plugins: [react(), tailwindcss()]`, keeping the existing `server.proxy` block unchanged
- [X] T003 [P] Add a `mobile-320` project to `playwright.config.ts` (`{ ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } }`, `testMatch: /(a11y|ui-refresh)\.spec\.ts/`) and widen the existing `mobile-360` `testMatch` to `/(a11y|ui-refresh)\.spec\.ts/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design system that every story uses. ⚠️ No user-story work starts until this phase is done.

- [X] T004 Create `frontend/src/styles/app.css` with `@import "tailwindcss";` and the color tokens from `contracts/design-system.md` §1: define `--c-bg`, `--c-surface`, `--c-text`, `--c-muted`, `--c-border`, `--c-border-strong`, `--c-primary`, `--c-primary-hover`, `--c-primary-text`, `--c-primary-soft`, `--c-danger`, `--c-danger-bg`, `--c-warning`, `--c-warning-bg`, `--c-success`, `--c-success-bg`, `--c-info`, `--c-info-bg`, `--c-neutral`, `--c-neutral-bg`, `--c-focus` on `:root` with the **Light** hex values and override them inside `@media (prefers-color-scheme: dark) { :root { … } }` with the **Dark** values. Then map them in `@theme inline { --color-bg: var(--c-bg); … --color-focus: var(--c-focus); --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }`
- [X] T005 In `frontend/src/styles/app.css` add `@layer base`: `html` uses `bg-bg text-text font-sans antialiased` with `line-height: 1.5` and `color-scheme: light dark`; `body { margin: 0; overflow-wrap: anywhere; }`; the global focus rule `:focus-visible, input[type='date']:focus-within { outline: 3px solid var(--color-focus); outline-offset: 2px; }` (keep the existing Chromium date-input comment from `global.css`); `a { color: var(--color-primary) }`; `h1` `text-2xl font-bold tracking-tight`; `h2` `text-lg font-semibold`; and a reduced-motion rule `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }` (FR-018)
- [X] T006 In `frontend/src/styles/app.css` add `@layer components` with exactly the primitives in `contracts/design-system.md` §3 using `@apply`: `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-link`, `card`, `input` (including `aria-[invalid=true]:border-danger` and `textarea.input { min-height: 5rem }`), `field-label`, `field-hint`, `field-error` (with `.field-error:empty { display: none }`), `badge`, `badge-neutral`, `badge-info`, `badge-warning`, `badge-success`, `badge-danger`. All buttons get `disabled:opacity-60 disabled:cursor-not-allowed` and `min-h-11`
- [X] T007 Switch the stylesheet in `frontend/src/main.tsx` to `import './styles/app.css';`, replacing the `tokens.css` and `global.css` imports, then delete `frontend/src/styles/tokens.css` and `frontend/src/styles/global.css`
- [X] T008 [P] Create `frontend/src/components/icons.tsx` exporting `MenuIcon`, `CloseIcon`, `PlusIcon`, `CheckIcon`, `AlertIcon`, `ClockIcon`: each is a 20×20 inline `<svg>` with `fill="none" stroke="currentColor" strokeWidth={2}`, `aria-hidden="true"`, `focusable="false"`, and accepts an optional `className` prop

**Checkpoint**: `npm run build -w frontend` succeeds and `npm run test -w frontend` is green. Screens look unstyled until US1, which is expected.

---

## Phase 3: User Story 1 - Consistent, modern look across every screen (Priority: P1) 🎯 MVP

**Goal**: Every route uses the shared design system in both light and dark schemes, with no legacy styling left (FR-001, FR-002, FR-004, FR-006–FR-010, FR-013–FR-016, FR-019).

**Independent Test**: Visit every route in `specs/001-meeting-action-tracker/contracts/ui-routes.md` (plus a 404) in light and dark. Each uses the same header, cards, buttons and badges; axe reports zero AA violations in both schemes; `npm run test` is green (quickstart V2, V4).

### Tests for User Story 1 (write first, confirm they fail) ⚠️

- [X] T009 [P] [US1] Create `frontend/tests/legacy-classes.test.ts`: read every `.tsx` file under `frontend/src` with `node:fs` and `node:path`, and fail if any `className` string contains a legacy class token from the "Global rules" list (split class strings on whitespace and compare whole class names against an explicit list; `card`, `field-hint`, `field-error` are new primitives and `empty-state` is a kept marker, so none are in it — `\b` matching was wrong because hyphens are word boundaries; analysis I1); also assert that `frontend/src/styles/global.css` and `tokens.css` do not exist (SC-001, FR-002)
- [X] T010 [P] [US1] Create `frontend/tests/badge.test.tsx`: render `StatusBadge` for each value and assert the label text plus the variant class: OPEN, CANCELLED → `badge-neutral`; IN_PROGRESS, MEDIUM → `badge-info`; BLOCKED, HIGH, overdue → `badge-warning`; DONE, RESOLVED, LOW → `badge-success`; CRITICAL → `badge-danger`. The overdue badge contains the text "Overdue" and an `svg[aria-hidden="true"]` (FR-007, FR-019)
- [X] T011 [P] [US1] Extend `e2e/a11y.spec.ts`: wrap the existing route checks in a `for (const scheme of ['light', 'dark'] as const)` loop that calls `await page.emulateMedia({ colorScheme: scheme })` before `check()`, and include the scheme in the test titles (SC-003, FR-015)

### Implementation for User Story 1

- [X] T012 [US1] Restyle the desktop header in `frontend/src/components/Layout.tsx`: skip link `sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn btn-secondary`; sticky header `sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur`; inner `mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16`; wordmark "MoM Tracker" `text-lg font-bold text-text no-underline`; nav links as pills (`rounded-full px-3 min-h-11 inline-flex items-center text-sm font-medium text-muted hover:text-text no-underline aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary`); user name `text-sm text-muted`; Sign out `btn btn-secondary`; `<main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 focus:outline-none">`. Keep `aria-label="Main"`, the NAV array and all link text unchanged
- [X] T013 [P] [US1] Restyle `frontend/src/components/StatusBadge.tsx` to `badge` + the variant mapping from contracts §3 (a value→variant lookup object), with the overdue badge rendering `<ClockIcon className="size-3.5" />` before "Overdue"; label text unchanged (makes T010 pass)
- [X] T014 [P] [US1] Restyle `frontend/src/components/FormField.tsx` (wrapper `flex flex-col gap-1.5 mb-4 min-w-0`, label `field-label`, hint `field-hint`, error `field-error`, control `input`; required marker `<span aria-hidden="true" className="text-danger">*</span>` only when the field is already marked required) and `frontend/src/components/ErrorMessage.tsx` (`rounded-lg border border-danger/30 bg-danger-bg text-danger px-4 py-3 flex gap-2` with `AlertIcon`). Keep every `id`, `aria-describedby` and `aria-live`
- [X] T015 [P] [US1] Restyle `frontend/src/components/ConfirmDialog.tsx`: backdrop `fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4`, panel `card shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto`, title `text-lg font-semibold`, actions `mt-6 flex flex-wrap justify-end gap-2`, Cancel `btn btn-secondary`, confirm `btn ${destructive ? 'btn-danger' : 'btn-primary'}`. Do not change any hook, ref, key handling or ARIA attribute (FR-013)
- [X] T016 [P] [US1] Restyle `frontend/src/components/ConflictBanner.tsx` (`rounded-lg border border-warning/40 bg-warning-bg text-warning px-4 py-3 flex gap-2` with `AlertIcon`) and `frontend/src/components/Breadcrumb.tsx` (`ol` as `flex flex-wrap items-center gap-1 text-sm text-muted mb-4`, separator `›` in `aria-hidden` spans; current crumb `text-text font-medium`)
- [X] T017 [P] [US1] Restyle `frontend/src/components/EmptyState.tsx`: keep `role="status"` and class `empty-state`, plus `card flex flex-col items-center gap-3 py-10 text-center`, a muted icon circle (`rounded-full bg-neutral-bg p-3 text-muted`), message `text-muted`, and the Clear filters button as `btn btn-secondary`
- [X] T018 [P] [US1] Restyle `frontend/src/components/Tabs.tsx` (tablist `flex gap-1 border-b border-border mb-4 overflow-x-auto`; tab `min-h-11 px-4 text-sm font-medium text-muted border-b-2 border-transparent -mb-px aria-selected:border-primary aria-selected:text-primary`) and `frontend/src/components/SummaryCounts.tsx` (grid `grid grid-cols-2 sm:grid-cols-4 gap-3`, each item `card p-4` with the number `text-2xl font-bold` and the label `text-sm text-muted`), keeping all roles and labels
- [X] T019 [P] [US1] Restyle `frontend/src/components/TraceabilityTree.tsx` (nested `ul` with `space-y-2`, child lists `ml-4 border-l border-border pl-4`, each node `flex flex-wrap items-center gap-2`) and `frontend/src/components/HistoryTab.tsx` (timeline list `space-y-3`, entries `card p-3 text-sm`, timestamps `text-muted`)
- [X] T020 [P] [US1] Restyle `frontend/src/components/FilterBar.tsx`: container `card mb-6 flex flex-wrap items-end gap-4`, fieldsets `border-0 p-0 m-0`, checkboxes `inline-flex items-center gap-2 min-h-11 text-sm`, selects and inputs `input w-auto min-w-40`, Clear `btn btn-secondary`, result count `text-sm text-muted` (keep `data-testid="result-count"` and `role="status"`)
- [X] T021 [P] [US1] Restyle `frontend/src/components/ParticipantPicker.tsx` (chips `badge badge-neutral gap-1` with a 44px remove button `btn-link min-w-11`; suggestions list `card mt-1 p-1 divide-y divide-border`, items `min-h-11 w-full text-left px-3 hover:bg-primary-soft`) and `frontend/src/components/MeetingForm.tsx` (`grid gap-4 sm:grid-cols-2`, description full width, submit `btn btn-primary`, cancel `btn btn-secondary`)
- [X] T022 [P] [US1] Restyle `frontend/src/components/ActionItemForm.tsx` and `frontend/src/components/IssueForm.tsx`: `card` form, `grid gap-4 sm:grid-cols-2`, full-width description, actions `flex flex-wrap gap-2 justify-end`, primary submit `btn btn-primary`
- [X] T023 [P] [US1] Restyle `frontend/src/components/ActionItemEditor.tsx` and `frontend/src/components/IssueEditor.tsx`: `card` with section title `text-lg font-semibold mb-4`, fields in a `grid gap-4 sm:grid-cols-2`, Save `btn btn-primary`, inline "Saved" status `text-sm text-success inline-flex items-center gap-1` with `CheckIcon` (keep `role="status"` and the exact text)
- [X] T024 [P] [US1] Restyle `frontend/src/components/CommentList.tsx` (comments `space-y-3`, each `rounded-lg bg-neutral-bg p-3`, author `font-semibold text-sm`, time `text-xs text-muted`; form textarea `input`, submit `btn btn-primary`) and `frontend/src/components/DeleteButton.tsx` (trigger `btn btn-danger`; impact list in the dialog `list-disc pl-5 text-sm space-y-1`)
- [X] T025 [P] [US1] Restyle `frontend/src/components/ActionItemRow.tsx` and `frontend/src/components/IssueList.tsx` table markup: wrapper `overflow-x-auto rounded-xl border border-border bg-surface`, `table w-full text-sm`, `thead` `bg-neutral-bg text-left text-xs font-semibold uppercase tracking-wide text-muted`, cells `px-4 py-3 align-top`, rows `border-t border-border hover:bg-primary-soft/40`, overdue rows `bg-warning-bg` plus the overdue `StatusBadge` (FR-008, FR-019); title links `font-medium text-primary hover:underline`
- [X] T026 [US1] Add a shared page-header pattern to all pages, as markup only with no new component: `<div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1>…</h1>{primary action as btn btn-primary with PlusIcon}</div>`. Apply it to `frontend/src/pages/HomePage.tsx`, `MeetingsListPage.tsx`, `ActionItemsListPage.tsx`, `IssuesListPage.tsx` and `DeletedPage.tsx`, replacing `page-header`, `row`, `stack`, `muted`, `plain-list` with utilities (lists become `space-y-3` of `card` items with `flex flex-wrap items-center justify-between gap-3`) and the CSV export link with `btn btn-secondary`
- [X] T027 [US1] Restyle the detail and edit pages `frontend/src/pages/MeetingDetailPage.tsx`, `ActionItemDetailPage.tsx`, `IssueDetailPage.tsx`, `MeetingNewPage.tsx` and `MeetingEditPage.tsx`: Breadcrumb at the top, page header as in T026, information grouped into titled `card` sections (Details, Participants, Action items / Issues, Comments, History) laid out `grid gap-6 lg:grid-cols-3` with the main column `lg:col-span-2` (FR-009); replace every legacy class
- [X] T028 [P] [US1] Redesign `frontend/src/pages/LoginPage.tsx` and `frontend/src/pages/RegisterPage.tsx` (FR-014): full-height centered layout `min-h-dvh flex items-center justify-center px-4 py-12`, wordmark above a `card w-full max-w-md shadow-lg` holding the h1 ("Sign in" / "Create account", unchanged), the fields, a full-width `btn btn-primary w-full` submit, and a `text-sm text-muted` switch link. Restyle `frontend/src/pages/NotFoundPage.tsx` the same way, with a `btn btn-primary` link home
- [X] T029 [US1] Run `npm run test -w frontend` and `npx playwright test e2e/a11y.spec.ts --project=desktop`. Fix any contrast or labelling violation in the affected component, not in the test, until T009–T011 pass and the full existing suite is green (SC-002, SC-003)

**Checkpoint**: US1 is the MVP. The app looks new and consistent everywhere and is accessible in both schemes.

---

## Phase 4: User Story 2 - Easier navigation and clearer feedback (Priority: P2)

**Goal**: The active section is announced, loading shows skeletons, empty states offer a next step, form errors focus the first invalid field, and successful mutations show toasts (FR-004, FR-011, FR-012).

**Independent Test**: quickstart V5. Use a slow network for skeletons, an empty filter for the empty state, an invalid form for focus, a save for the toast, and a delete for the dialog.

### Tests for User Story 2 (write first, confirm they fail) ⚠️

- [X] T030 [P] [US2] Create `frontend/tests/toast.test.tsx` (data-model "Toast"): render `<ToastProvider>` with a test button that calls `useToast().success('Meeting created')`. Assert the message appears inside the element with `aria-live="polite"` and that this region has **no** `role="status"` (existing tests rely on a single `status` role); with `vi.useFakeTimers()` it disappears after 4000 ms; it stays while hovered or focused (timer paused); the "Dismiss notification" button removes it immediately; a 4th toast evicts the oldest so at most 3 are visible; the message renders as text, so `'<b>x</b>'` appears literally
- [X] T031 [P] [US2] Create `frontend/tests/layout.test.tsx` (first part): render `Layout` within `renderWithProviders` at route `/meetings` and assert the "Meetings" link has `aria-current="page"` and "My work" does not
- [X] T032 [P] [US2] Create `frontend/tests/feedback.test.tsx` using `mockFetch` + `renderWithProviders`: (a) with a never-resolving `GET /api/action-items`, `ActionItemsListPage` shows `getByRole('status')` whose text starts with "Loading" and contains skeleton rows (`[data-skeleton]`); (b) submitting `MeetingNewPage` empty moves focus to the first invalid field (`document.activeElement` equals the description input); (c) after a successful `POST /api/meetings` the toast text "Meeting created" appears; (d) after a successful `POST /api/meetings/:id/action-items` on `MeetingDetailPage` the toast text "Action item added" appears; (e) after confirming delete in `DeleteButton` the toast text "Deleted" appears; (f) the meetings-list empty state with no filters shows a "New meeting" action link
- [X] T033 [P] [US2] Create `e2e/ui-refresh.spec.ts` (first part): sign in as the organizer, create a meeting via `/meetings/new`, and expect the text "Meeting created" to be visible, then hidden after about 5 s; add an action item and expect "Action item added"

### Implementation for User Story 2

- [X] T034 [US2] Create `frontend/src/components/Toast.tsx` per data-model "Toast": `ToastProvider` holding `{ id, kind: 'success' | 'error' | 'info', message, createdAt }[]`, capped at 3 (evict the oldest); `useToast()` returns `{ success, error, info }` and falls back to no-op functions when there is no provider (so existing tests that render without it are unaffected); auto-dismiss after 4000 ms, paused on `mouseenter`/`focusin` and resumed on leave/blur; one region `<div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">`; each toast `pointer-events-auto card shadow-lg flex items-start gap-3 p-3 pr-2 max-w-sm motion-safe:animate-[toast-in_150ms_ease-out]` with a kind icon (`CheckIcon` text-success / `AlertIcon` text-danger) and a `btn-link min-w-11` "Dismiss notification" button (icon plus `sr-only` label). Message rendered as a text node only. Add `@keyframes toast-in` to `frontend/src/styles/app.css`
- [X] T035 [US2] Mount `<ToastProvider>` around the routes in `frontend/src/App.tsx` and inside `renderWithProviders` in `frontend/tests/utils.tsx`
- [X] T036 [P] [US2] Create `frontend/src/components/Skeleton.tsx` exporting `<LoadingSkeleton rows={n} label="Loading…" />`: `<div role="status" className="space-y-3">`, an `sr-only` span with `label` as the first child (the accessible text must start with "Loading", which the e2e a11y check relies on), and `n` bars `<div data-skeleton aria-hidden="true" className="h-12 rounded-lg bg-neutral-bg motion-safe:animate-pulse" />`
- [X] T037 [US2] Replace each `<p role="status">Loading…</p>` with `<LoadingSkeleton …/>` in `frontend/src/pages/ActionItemsListPage.tsx`, `IssuesListPage.tsx`, `MeetingsListPage.tsx`, `HomePage.tsx` (both lists), `DeletedPage.tsx`, `MeetingDetailPage.tsx` (both), `ActionItemDetailPage.tsx`, `IssueDetailPage.tsx`, `MeetingEditPage.tsx`, `frontend/src/components/HistoryTab.tsx` (label "Loading history…") and `frontend/src/auth/ProtectedRoute.tsx`. Keep the label text identical to the current text
- [X] T038 [US2] Add success toasts at the existing mutation call sites, after the awaited `mutateAsync` resolves and without changing control flow: `frontend/src/pages/MeetingNewPage.tsx` "Meeting created"; `MeetingEditPage.tsx` "Meeting updated"; `MeetingDetailPage.tsx` "Action item added"; `ActionItemDetailPage.tsx` "Issue raised" and "Comment added"; `frontend/src/components/DeleteButton.tsx` "Deleted". Do **not** add toasts where an inline confirmation already exists (the "Saved" text in `ActionItemEditor`/`IssueEditor` and "Restored …" in `DeletedPage`), which avoids duplicate announcements and keeps existing locators unique
- [X] T039 [US2] Extend `frontend/src/components/EmptyState.tsx` with an optional `action?: { label: string; to: string }` prop rendered as a `Link` with `btn btn-primary` (the existing `onClear` button stays). Pass `{ label: 'New meeting', to: '/meetings/new' }` from `MeetingsListPage.tsx` and `HomePage.tsx` when no filters are active
- [X] T040 [US2] Verify that no `useForm` call in `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `frontend/src/components/MeetingForm.tsx`, `ActionItemForm.tsx`, `IssueForm.tsx`, `ActionItemEditor.tsx` or `IssueEditor.tsx` sets `shouldFocusError: false`. For forms that validate manually (e.g. `safeParse` in the editors), focus the first field with an error after a failed submit via `setFocus` or a ref, so T032(b) passes everywhere (US2 scenario 4)
- [X] T041 [US2] Run `npm run test -w frontend` and `npx playwright test e2e/ui-refresh.spec.ts e2e/deletion.spec.ts e2e/us2-update-progress.spec.ts --project=desktop` until T030–T033 and all existing tests pass

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Comfortable use on phones and tablets (Priority: P3)

**Goal**: A collapsible nav under 768px, no horizontal page scroll from 320px, touch targets of at least 44px, and readable tables on narrow screens (FR-005, FR-017, FR-018).

**Independent Test**: quickstart V3. Run the core flows at 375px, plus Playwright projects `mobile-320` and `mobile-360`.

### Tests for User Story 3 (write first, confirm they fail) ⚠️

- [X] T042 [P] [US3] Add mobile-nav tests to `frontend/tests/layout.test.tsx` (data-model "Mobile navigation menu"): a button named "Menu" has `aria-expanded="false"` and an `aria-controls` that points to the nav panel id; clicking it sets `aria-expanded="true"`; Escape sets it back to `false` and focus returns to the button; clicking a nav link closes it; navigating to another route closes it
- [X] T043 [P] [US3] Add to `e2e/ui-refresh.spec.ts` a `test.describe` that runs only when `testInfo.project.name` starts with `mobile-`: the inline nav is hidden and the "Menu" button is visible; open it with the keyboard (focus, then Enter), activate "Action items", expect URL `/action-items` and the menu closed; complete the core flow (create meeting → add action item → change status → filter by "Me") with no horizontal page scroll (reuse the `expectNoHorizontalScroll` logic from `e2e/a11y.spec.ts`, moved into `e2e/fixtures.ts`); and every visible `button`, `a.btn` and `input` has a bounding box height of at least 44
- [X] T044 [P] [US3] Add to `e2e/ui-refresh.spec.ts` a reduced-motion test: `page.emulateMedia({ reducedMotion: 'reduce' })`, open Action items with a delayed route (`page.route` adds a 1 s delay), and assert that the computed `animation-name` of `[data-skeleton]` is `none`

### Implementation for User Story 3

- [X] T045 [US3] Implement the mobile navigation disclosure in `frontend/src/components/Layout.tsx`: `const [open, setOpen] = useState(false)`; the desktop nav `<ul>` gets `hidden md:flex`; the "Menu" button (`md:hidden btn btn-secondary min-w-11 px-3`, `aria-expanded={open}`, `aria-controls={panelId}` from `useId()`, `MenuIcon`/`CloseIcon` plus an `sr-only` "Menu" label) toggles the panel `<nav id={panelId} aria-label="Main" className="md:hidden border-t border-border bg-surface shadow-lg">` listing the same `NAV` links (`flex min-h-11 items-center px-4`) and the user name with Sign out. Close on link click, on Escape (`keydown` listener while open, then focus the button via a ref), on `useLocation().pathname` change, and on `matchMedia('(min-width: 768px)')` change. Keep only one `aria-label="Main"` nav in the accessibility tree at a time (the desktop nav uses `hidden md:flex`, so it is `display:none` on mobile)
- [X] T046 [P] [US3] Make tables narrow-friendly in `frontend/src/components/ActionItemRow.tsx`, `frontend/src/components/IssueList.tsx` and `frontend/src/pages/DeletedPage.tsx`: add `hidden sm:table-cell` only to secondary columns (meeting name, created date, severity when status is shown); title, status, owner/assignee and due date columns are never hidden; long titles get `break-words`; the table wrapper stays `overflow-x-auto` so only the table scrolls, not the page
- [X] T047 [P] [US3] Audit touch targets in `frontend/src/components/FilterBar.tsx`, `ParticipantPicker.tsx`, `Breadcrumb.tsx`, `TraceabilityTree.tsx`, `CommentList.tsx` and `Tabs.tsx`: every interactive element is at least 44×44 (`min-h-11`, plus `min-w-11` for icon-only buttons; inline text links in lists get `inline-flex items-center min-h-11`); stack filter controls full width under `sm` (`w-full sm:w-auto`)
- [X] T048 [US3] Run `npx playwright test --project=mobile-320 --project=mobile-360` and `npm run test -w frontend` until T042–T044 and all a11y/no-horizontal-scroll checks pass (SC-004)

**Checkpoint**: All three user stories are complete and independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T049 [P] Check the 200% zoom edge case: in Playwright or manually, set `page.setViewportSize({ width: 640, height: 400 })` (equivalent to 1280px at 200%) on Meeting detail, Action items and New meeting, and fix any overlap or clipping in the affected component
- [X] T050 [P] Measure the bundle: run `npm run build -w frontend` and confirm the emitted CSS in `frontend/dist/assets/*.css` is ≤ 30 KB gzip (`gzip -c file | wc -c`). Record the size and the `master` comparison in the PR description (plan Performance Goals, SC-007)
- [X] T051 [P] Update `README.md` with a short "UI / Styling" section: Tailwind v4 via `@tailwindcss/vite`, tokens and primitives live in `frontend/src/styles/app.css`, rules in `specs/002-tailwind-ui-refresh/contracts/design-system.md`, no raw palette classes or `dark:` variants
- [X] T052 Run the full gate `npm run check` and `npm run test:e2e` (quickstart V1). Everything must be green with no existing behavior test modified (SC-002)
- [X] T053 Run quickstart V4–V6 manually (consistency walkthrough in light and dark, feedback states, reduced motion and zoom) and fix any remaining legacy or unstyled element
- [ ] T054 Run the quickstart V7 user review (at least 5 users, `master` vs this branch) and record the results for SC-005 and SC-006 in `specs/002-tailwind-ui-refresh/review-results.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001 → T002; T003 is independent.
- **Foundational (Phase 2)**: needs T001–T002. T004 → T005 → T006 (same file) → T007; T008 is parallel. **Blocks all stories.**
- **US1 (Phase 3)**: needs Phase 2. This is the MVP.
- **US2 (Phase 4)**: needs Phase 2. It can technically start in parallel with US1, but T037–T039 edit pages restyled in T026–T027, so run it after US1 to avoid merge conflicts.
- **US3 (Phase 5)**: needs Phase 2. T045 edits `Layout.tsx` after T012 (US1); T046 edits files from T025/T026. Run it after US1.
- **Polish (Phase 6)**: needs all desired stories.

### Within each story

Tests (T009–T011, T030–T033, T042–T044) are written first and must fail → components → pages → story verification task (T029, T041, T048).

### Key task-level dependencies

- T013 needs T008 (icons). T014–T017 and T023 need T008.
- T026 and T027 need T013–T025 (they use the restyled components).
- T034 → T035 → T038 (the toast must exist and be mounted before call sites use it).
- T036 → T037. T039 needs T017.
- T045 needs T012. T043 needs T003 (mobile projects).

---

## Parallel Example: User Story 1

```text
# Tests together (different files):
T009 frontend/tests/legacy-classes.test.ts
T010 frontend/tests/badge.test.tsx
T011 e2e/a11y.spec.ts

# Then component restyles together (each touches different files):
T013 StatusBadge   T014 FormField+ErrorMessage   T015 ConfirmDialog   T016 ConflictBanner+Breadcrumb
T017 EmptyState    T018 Tabs+SummaryCounts       T019 Tree+History    T020 FilterBar
T021 ParticipantPicker+MeetingForm   T022 ActionItemForm+IssueForm   T023 Editors
T024 CommentList+DeleteButton        T025 ActionItemRow+IssueList    T028 Login/Register/NotFound
```

## Parallel Example: User Story 2

```text
T030 toast.test.tsx   T031 layout.test.tsx   T032 feedback.test.tsx   T033 e2e/ui-refresh.spec.ts
then T034 Toast.tsx  ||  T036 Skeleton.tsx
```

## Parallel Example: User Story 3

```text
T042 layout.test.tsx  ||  T043 + T044 e2e/ui-refresh.spec.ts (same file, so write them together)
then T045 Layout.tsx  ||  T046 tables  ||  T047 touch-target audit
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **stop and validate** with quickstart V2 and V4 and the full test suite
3. Demo: the whole app has the new look in light and dark, with nothing broken

### Incremental delivery

1. US1 → a visibly new, consistent, accessible UI (MVP)
2. US2 → clearer feedback (skeletons, toasts, empty-state actions, focus on error)
3. US3 → phone and tablet comfort (menu, 320px, touch targets)
4. Polish → zoom, bundle size, docs, full gate, user review

Commit after each task or logical group, referencing the task ID (constitution workflow).

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Toast region deliberately has **no** `role="status"` (only `aria-live="polite"`). `frontend/tests/deletion.test.tsx` uses `findByRole('status')` and expects a single match.
- Toasts are not added where inline "Saved"/"Restored" confirmations already exist, which avoids double announcements and duplicate text locators in e2e.
- Total: 54 tasks.

## Implementation notes (2026-10-27)

Deviations from the task text above, including the `/speckit-analyze` findings applied during implementation:

- **I1 (T009)**: the legacy-class guard splits class strings into whole names; `card`, `field-hint`, `field-error` are new primitives and are not flagged.
- **US1 test order**: T009–T011 were written after the US1 restyle, not before. To compensate, they were run against the `master` sources and failed there (15 of 16; the parser self-check passes), proving they detect the old styling.
- **Regression guards**: T031 (`aria-current`), T032(b) (first-invalid focus) and T044 (reduced motion) passed on first run because the behavior already existed (NavLink, react-hook-form, the T005 base rule). They are kept as guards.
- **C1 (T032)**: added a test that the destructive confirm button is `btn-danger` and Cancel is `btn-secondary`. Sub-tests (d) "Action item added" and the comment/issue toasts are covered end-to-end in `e2e/ui-refresh.spec.ts`, not in jsdom.
- **I2 / G2 / G3 (T043)**: the touch-target check measures checkbox **labels**, not the 16px boxes; icon-only buttons are also checked for width ≥ 44; a 320px/360px check asserts the Action item, Status, Assignee and Due columns stay visible. The flow checks `/action-items` unfiltered because "Me" has no rows for the seeded organizer.
- **U1 (T045)**: the whole desktop `<nav>` is `hidden md:block`, and the mobile panel is rendered only while open, so there is only ever one "Main" landmark. Being open is tied to the current path, so navigation closes the menu without a state-setting effect.
- **T037–T039**: `HomePage` has no `EmptyState` (it shows plain text), so the "New meeting" action was added to `MeetingsListPage` only.
- **T040**: no `useForm` overrides `shouldFocusError`. The editors validate manually and show a single form-level error, so there is no per-field focus target.
- **Base styles**: text inputs, selects, textareas and table cells get the design-system look from zero-specificity `:where()` base rules, so `FormField` callers did not need a class on every control. Links are underlined by default, because Tailwind's preflight removes underlines and axe flagged `link-in-text-block`.
- **T049**: checked at a 640×400 viewport (equivalent to 1280px at 200%) on Meeting detail, Action items and New meeting. No horizontal scroll, and the screenshots showed no overlap.
- **T050**: production CSS is 28.4 KB raw / 6.2 KB gzip (budget ≤ 30 KB), up from 9.7 KB / 2.4 KB for the old stylesheets, so about +3.8 KB gzip against ~154 KB gzip of JavaScript. A real page-load timing comparison against `master` (analysis G1) was **not** run; SC-007 is not yet verified by measurement.
- **T053**: the visual walkthrough in light and dark found and fixed two issues: summary tiles broke words mid-word (the grid is now auto-fill with `overflow-wrap: normal`), and the tree sat too close to the tiles. The full e2e run also caught a regression: the breadcrumb separator had become part of each crumb's text, so it is CSS (`::before`) again, as it was originally.
- **T054** (user review, SC-005/SC-006) needs real users and remains open.
