# Contract: Design System

The single source of visual truth for the refresh (spec FR-001, FR-002). Every screen and
component uses only these tokens and primitives plus Tailwind layout/spacing utilities. Routes and
screen behavior remain as defined in
[001 ui-routes.md](../../001-meeting-action-tracker/contracts/ui-routes.md); this feature does not
change that contract.

## 1. Color tokens

Defined as CSS custom properties in `frontend/src/styles/app.css` and mapped to Tailwind via
`@theme inline` (e.g. `--color-surface` → `bg-surface`, `text-surface`, `border-surface`). Dark
values apply under `@media (prefers-color-scheme: dark)`.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `bg` | `#f8fafc` | `#020617` | Page background |
| `surface` | `#ffffff` | `#0f172a` | Cards, header, inputs, dialogs |
| `text` | `#0f172a` | `#f1f5f9` | Body text |
| `muted` | `#475569` | `#94a3b8` | Secondary text, hints |
| `border` | `#e2e8f0` | `#1e293b` | Decorative dividers only |
| `border-strong` | `#64748b` | `#64748b` | Input / control boundaries |
| `primary` | `#4338ca` | `#818cf8` | Primary buttons, links, active nav |
| `primary-hover` | `#3730a3` | `#a5b4fc` | Primary hover |
| `primary-text` | `#ffffff` | `#0f172a` | Text on `primary` / `danger` fills |
| `primary-soft` | `#eef2ff` | `#1e1b4b` | Active nav pill, selected tab background |
| `danger` / `danger-bg` | `#b91c1c` / `#fef2f2` | `#f87171` / `#450a0a` | Destructive, errors, critical |
| `warning` / `warning-bg` | `#92400e` / `#fffbeb` | `#fcd34d` / `#451a03` | Overdue, blocked, high, conflict banner |
| `success` / `success-bg` | `#166534` / `#f0fdf4` | `#86efac` / `#052e16` | Done, resolved, low, success toast |
| `info` / `info-bg` | `#1e40af` / `#eff6ff` | `#93c5fd` / `#172554` | In progress, medium |
| `neutral` / `neutral-bg` | `#334155` / `#f1f5f9` | `#cbd5e1` / `#1e293b` | Open, cancelled, default badge |
| `focus` | `#d97706` | `#fbbf24` | Focus ring |

**Verified contrast** (computed during planning; must be re-verified by axe in both schemes):

| Pair | Light | Dark | Required |
|------|-------|------|----------|
| text on surface / bg | 17.85 / 17.06 | 16.30 / 18.41 | 4.5 |
| muted on surface / bg | 7.58 / 7.24 | 6.96 / 7.87 | 4.5 |
| primary on surface / bg | 7.90 / 7.55 | 5.98 / 6.76 | 4.5 |
| primary-text on primary | 7.90 | 5.98 | 4.5 |
| primary on primary-soft | 7.07 | 5.36 | 4.5 |
| primary-text on danger | 6.47 | 6.45 | 4.5 |
| danger on danger-bg | 5.91 | 5.84 | 4.5 |
| warning on warning-bg | 6.84 | 10.39 | 4.5 |
| success on success-bg | 6.81 | 10.62 | 4.5 |
| info on info-bg | 8.01 | 8.15 | 4.5 |
| neutral on neutral-bg | 9.45 | 9.85 | 4.5 |
| border-strong on surface | 4.76 | 3.75 | 3.0 (non-text) |
| focus on surface / bg | 3.19 / 3.04 | 10.69 / 12.08 | 3.0 (non-text) |

## 2. Other tokens

| Token | Value | Notes |
|-------|-------|-------|
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | No web fonts |
| Radius | `rounded-lg` (controls), `rounded-xl` (cards, dialogs), `rounded-full` (badges, nav pills) | |
| Shadow | `shadow-sm` (cards), `shadow-lg` (dialog, toast, mobile menu) | Dark mode relies on borders more than shadows |
| Content width | `max-w-6xl` (72rem) centered, `px-4 sm:px-6` | Matches previous `--max-width` |
| Breakpoints | Tailwind defaults; `md` (768px) switches nav menu ↔ inline nav | |

## 3. Component primitives (`@layer components`)

| Class | Purpose | Required states |
|-------|---------|-----------------|
| `btn` | Base: inline-flex, gap-2, `min-h-11`, px-4, rounded-lg, font-medium | focus-visible ring, `disabled:opacity-60 disabled:cursor-not-allowed` |
| `btn-primary` | `bg-primary text-primary-text hover:bg-primary-hover` | hover, active, disabled |
| `btn-secondary` | `bg-surface text-primary border border-border-strong hover:bg-primary-soft` | hover, active, disabled |
| `btn-danger` | `bg-danger text-primary-text hover:opacity-90` | hover, active, disabled |
| `btn-link` | Text-only, underline on hover, `min-h-11` hit area | focus-visible |
| `card` | `bg-surface border border-border rounded-xl shadow-sm p-4 sm:p-6` | — |
| `input` | `w-full min-h-11 bg-surface border border-border-strong rounded-lg px-3`; `aria-[invalid=true]:border-danger` | focus-visible ring |
| `field-label` | `text-sm font-semibold` | — |
| `field-hint` | `text-sm text-muted` | — |
| `field-error` | `text-sm text-danger`, hidden when empty | — |
| `badge` | `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap` | — |
| `badge-{neutral,info,warning,success,danger}` | Token pair from §1 | — |

Badge mapping (unchanged semantics, text label always shown — WCAG 1.4.1):

| Value | Variant |
|-------|---------|
| OPEN, CANCELLED, unknown | neutral |
| IN_PROGRESS, MEDIUM | info |
| BLOCKED, HIGH, Overdue | warning (Overdue also gets a clock icon) |
| DONE, RESOLVED, LOW | success |
| CRITICAL | danger |

Retained marker class: `empty-state` (used as an e2e locator). `visually-hidden` is replaced by
Tailwind's `sr-only`.

## 4. Behavioral UI elements (new)

| Element | Contract |
|---------|----------|
| **Header** | Wordmark link "MoM Tracker" → `/`; nav links with `aria-current="page"` on active (pill style `bg-primary-soft text-primary`); user name + Sign out. Sticky top, `border-b`. |
| **Mobile nav** (`< md`) | Button "Menu" with `aria-expanded`/`aria-controls`; panel lists the same links + Sign out; closes on link activation, route change, Escape (focus → button). |
| **Skip link** | `sr-only focus:not-sr-only` first focusable element, targets `#main`. |
| **Loading** | `role="status"` container whose accessible text starts with "Loading"; skeleton rows `motion-safe:animate-pulse`. |
| **Empty state** | Icon + message + optional action button; `role="status"`, class `empty-state`. |
| **Toast** | Single `aria-live="polite"` region (deliberately **no** `role="status"`, so existing `getByRole('status')` locators stay unambiguous), bottom-right (bottom-center `< sm`); ≤3 visible; auto-dismiss 4s (paused on hover/focus); close button labelled "Dismiss notification". |
| **Success messages** | Toasts: "Meeting created", "Meeting updated", "Action item added", "Issue raised", "Comment added", "Deleted". Action item/issue edits and restore keep their existing inline `role="status"` confirmations ("Saved", "Restored …") instead of a toast, to avoid duplicate announcements. |
| **Dialog** | Existing focus/Escape behavior unchanged; `card`-like panel with `shadow-lg`, backdrop `bg-black/50`, destructive button `btn-danger`, Cancel `btn-secondary`. |
| **Tables** | Inside `overflow-x-auto rounded-xl border`; header row `bg-neutral-bg text-sm`; overdue rows `bg-warning-bg` + "Overdue" badge. Status, owner, due date columns never hidden. |
| **Focus** | Global `:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px }` plus the date-input `:focus-within` rule. |
| **Motion** | Transitions only via `motion-safe:`; under `prefers-reduced-motion: reduce` all animations/transitions are disabled. |
| **Touch targets** | All `btn`, `input`, nav links, icon buttons ≥ 44×44 CSS px. |
