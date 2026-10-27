# Research: Tailwind UI Refresh

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-27

The spec fixes Tailwind CSS as a user-specified constraint. Research below settles how to adopt it
in the existing React 19 + Vite 6 frontend without changing behavior, and how to meet the new
usability requirements (FR-004..FR-019) with the fewest moving parts.

---

## R1. Tailwind version and build integration

- **Decision**: Tailwind CSS **v4** (`tailwindcss@^4.3`) via the first-party Vite plugin
  (`@tailwindcss/vite@^4.3`). One CSS entry `frontend/src/styles/app.css` containing
  `@import "tailwindcss";` replaces `tokens.css` + `global.css` in `main.tsx`.
- **Rationale**: v4 is the current major; the Vite plugin needs no PostCSS config or
  `tailwind.config.js` (CSS-first configuration via `@theme`), scans sources automatically, and
  supports Vite 5/6/7. Two dev dependencies, both MIT (passes `lint:licenses`).
- **Alternatives considered**:
  - Tailwind v3 + PostCSS + `tailwind.config.js` — older major, more config files, no benefit.
  - Play CDN — not for production; breaks CSP and offline builds.
  - Hand-written CSS refresh (no Tailwind) — rejected: contradicts the user-specified constraint.

## R2. Design tokens and dark mode

- **Decision**: Keep the existing WCAG-verified palette as CSS custom properties, exposed to
  Tailwind through `@theme inline` semantic tokens (`bg`, `surface`, `text`, `muted`, `border`,
  `primary`, `danger`, `success`, `warning`, `info`, `neutral`, `focus`). Light values on `:root`,
  dark values under `@media (prefers-color-scheme: dark)`. Components use semantic utilities
  (`bg-surface`, `text-muted`, `border-border`) rather than raw palette classes (`bg-blue-700`).
  The palette is refreshed (indigo/slate family) but every text/background pair is re-verified to
  ≥4.5:1 (≥3:1 for large text and UI component boundaries).
- **Rationale**: One place to define colors; dark mode "just works" without `dark:` variants on
  every element; contrast is auditable from a single token table (see
  [contracts/design-system.md](./contracts/design-system.md)). Matches spec assumption "follows
  device preference, no manual toggle".
- **Alternatives considered**:
  - `dark:` variant on every element — doubles class strings, easy to miss one screen (violates
    SC-001/SC-003 risk).
  - Class-based dark mode with a toggle — out of scope per spec Assumptions.

## R3. Styling approach: utilities vs. component classes

- **Decision**: Hybrid. Layout, spacing, and one-off styling use Tailwind utilities directly in
  JSX. A small, fixed set of repeated primitives is defined once in `@layer components` with
  `@apply`: `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-link`, `card`, `input`,
  `field-label`, `field-hint`, `field-error`, `badge` + variants. All legacy class names from
  `global.css` are removed (FR-002), except `empty-state`, which an e2e test uses as a locator and
  which stays as a stable marker class.
- **Rationale**: Buttons/inputs/badges appear 100+ times; repeating 10–15 utilities each time hurts
  readability and consistency (FR-001, FR-006). Component classes stay tiny and documented in the
  design-system contract. No extra libraries (`clsx`, `cva`, component kits) — template strings
  cover the few conditional class cases (YAGNI, constitution V).
- **Alternatives considered**:
  - Pure utilities everywhere — inconsistent drift across 37 files; very long class strings.
  - New React primitive components (`<Button variant>`) for everything — larger diff touching every
    call site's props; reserved only where behavior is added (Toast, NavMenu, Skeleton).
  - Component library (shadcn/ui, Headless UI, daisyUI) — new dependencies and their own a11y
    semantics that would need re-verification; existing components already handle focus/ARIA.

## R4. Typography and icons

- **Decision**: System font stack via `--font-sans` (no web font download). Typography scale from
  Tailwind defaults (`text-sm`…`text-2xl`). Icons as a handful of inline SVG components
  (`frontend/src/components/icons.tsx`: menu, close, plus, check, alert, clock) with
  `aria-hidden="true"`; text labels always present.
- **Rationale**: No layout shift or network cost (SC-007); inline SVGs avoid an icon dependency for
  ~6 glyphs and inherit `currentColor` for both themes.
- **Alternatives considered**: Inter via Google Fonts (extra request, privacy); `lucide-react`
  (dependency for 6 icons).

## R5. Responsive navigation (FR-005)

- **Decision**: New `NavMenu` behavior inside `Layout`: at `< md` (768px) the nav list is hidden
  behind a disclosure button (`aria-expanded`, `aria-controls`, label "Menu"); it closes on route
  change and on Escape (focus returns to the button). At `≥ md` the full horizontal nav shows.
  Active link uses `aria-current="page"` (already provided by `NavLink`) styled as a pill.
- **Rationale**: Disclosure pattern is the simplest accessible mobile-nav pattern (WAI-ARIA APG);
  no focus trap needed because it is not modal.
- **Alternatives considered**: Off-canvas drawer (modal, needs focus trap, more code); bottom tab
  bar (5 items + sign-out is too crowded at 320px).

## R6. Loading, empty, and success feedback (FR-011, FR-012)

- **Decision**:
  - **Loading**: `Skeleton` component (pulsing placeholder rows) wrapped in an element with
    `role="status"` and visually-hidden text starting "Loading…", so the existing e2e check
    (`status` matching `/^Loading/` disappears) keeps working. Pulse disabled under
    `motion-reduce:`.
  - **Empty**: restyle `EmptyState` (icon, message, optional action) keeping `role="status"` and
    the `empty-state` class.
  - **Success**: lightweight `ToastProvider` + `useToast()` in `frontend/src/components/Toast.tsx`;
    one `aria-live="polite"` region, messages auto-dismiss after 4s, dismissible by button, max 3
    visible. Mutations call `toast.success('Meeting saved')` etc. in their existing `onSuccess`.
- **Rationale**: Meets FR-011/012 with zero dependencies; announcing via a single live region is the
  recommended pattern; keeps current test locators.
- **Alternatives considered**: `react-hot-toast`/`sonner` (dependency + own styling to override);
  spinners only (less informative than skeletons for lists).

## R7. Form errors and focus (FR-010, US2 scenario 4)

- **Decision**: Keep `FormField` structure (label + `aria-describedby` hint/error + `aria-live`),
  restyle only. Confirm react-hook-form's default `shouldFocusError: true` is in effect on every
  `useForm` call (no form overrides it today); add a test asserting first-invalid-field focus.
- **Rationale**: Behavior already exists; the refresh must not regress it.

## R8. Tables on narrow screens (US3, FR-017)

- **Decision**: Action items / issues / deleted lists keep semantic `<table>` markup inside a
  `overflow-x-auto` container with `rounded-lg border` (contained horizontal scroll, page itself
  never scrolls). Columns of lower priority get `hidden sm:table-cell` only where the same
  information is also visible in the row's primary cell (status, owner, due date always visible).
  My work and Meetings use card lists (`ul` of cards) which reflow naturally.
- **Rationale**: Preserves table semantics that existing tests query by role (`row`, `cell`);
  avoids duplicating markup for a mobile card variant.
- **Alternatives considered**: Separate card layout for mobile — duplicated DOM confuses
  `getByRole` queries and screen readers.

## R9. Touch targets, focus, and motion (FR-016..FR-018)

- **Decision**: `btn` and `input` have `min-h-11` (44px); nav links and icon buttons `min-h-11
  min-w-11`. Global `:focus-visible` ring using the `focus` token (3px outline, 2px offset),
  preserving the existing date-input `:focus-within` workaround. All transitions use
  `motion-safe:` utilities; a base rule sets `animation`/`transition` to none under
  `prefers-reduced-motion: reduce`.
- **Rationale**: WCAG 2.5.5 (AAA target size) is not required by the constitution, but SC/FR-017
  asks for 44px; Tailwind makes it a one-class guarantee on the shared primitives.

## R10. Verification strategy (constitution II — test first)

- **Decision**:
  - **Unit/component (Vitest + Testing Library, jsdom)**: new tests written first for new
    behaviors — `NavMenu` (toggle, `aria-expanded`, Escape, closes on navigation), `Toast`
    (announces, auto-dismiss with fake timers, manual dismiss), `Skeleton` (status text), success
    toasts after create/update/delete, first-invalid-field focus. Existing tests must pass
    unmodified except where they assert a removed class name (none today).
  - **E2E (Playwright + axe)**: extend `e2e/a11y.spec.ts` to run every route in **dark** color
    scheme (`page.emulateMedia({ colorScheme: 'dark' })`) and add a **320px** project alongside the
    existing 360px one; add a reduced-motion check; add `e2e/ui-refresh.spec.ts` for mobile nav and
    toast flows. jsdom does not render CSS, so visual/contrast checks live only in Playwright.
  - **Manual**: quickstart visual walkthrough + 5-user preference review for SC-005/SC-006.
- **Rationale**: Every new behavior gets a failing test before code; styling-only changes are
  covered by the existing behavior suite (SC-002) plus axe in both schemes (SC-003).

## R11. Tooling hygiene

- **Decision**: No `prettier-plugin-tailwindcss` (class-order formatting would churn every file and
  is cosmetic). ESLint `jsx-a11y` rules unchanged. `npm run check` remains the gate.
- **Rationale**: Keeps the diff reviewable; can be added later independently.
