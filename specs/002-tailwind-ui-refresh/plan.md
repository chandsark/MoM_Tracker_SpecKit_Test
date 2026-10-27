# Implementation Plan: Tailwind UI Refresh

**Branch**: `002-tailwind-ui-refresh` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-tailwind-ui-refresh/spec.md`

## Summary

Replace the frontend's hand-written CSS (`tokens.css`, `global.css`) with Tailwind CSS v4 and a
small, documented design system, then restyle every screen for a consistent, modern, accessible
look (US1), add clearer navigation and feedback — active nav, skeleton loading, richer empty
states, success toasts (US2) — and a collapsible mobile nav with 44px touch targets (US3). No
business behavior, routes, API calls, or data change. Approach: Tailwind via the official Vite
plugin, semantic color tokens with automatic dark mode, ~12 shared component classes in
`@layer components`, utilities for layout, and three small new React pieces (Toast, mobile nav,
Skeleton) built test-first. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.8, React 19.1 (frontend only; backend untouched)

**Primary Dependencies**: Existing — Vite 6, React Router 7, TanStack Query 5, react-hook-form 7,
zod 4. **New (dev)** — `tailwindcss@^4.3`, `@tailwindcss/vite@^4.3` (both MIT)

**Storage**: N/A (no data changes)

**Testing**: Vitest 3 + Testing Library (jsdom) for components; Playwright 1.52 + `@axe-core/playwright`
for e2e, accessibility, viewport, color-scheme, and reduced-motion checks

**Target Platform**: Evergreen browsers (latest 2 of Chrome, Edge, Firefox, Safari); 320px → wide desktop

**Project Type**: Web application (npm workspaces: `shared`, `backend`, `frontend`)

**Performance Goals**: No more than 10% regression in time-to-usable versus `master` (SC-007); production
CSS bundle ≤ 30 KB gzip (Tailwind emits only used utilities)

**Constraints**: WCAG 2.1 AA in light and dark; no horizontal page scroll 320px+; touch targets ≥
44px; honor `prefers-reduced-motion`; zero behavior change (all existing tests pass); no new
runtime dependencies

**Scale/Scope**: 13 routes, 23 components, 14 pages, 2 stylesheets (~510 lines) replaced; ~157
`className` usages restyled

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Spec-Driven | Spec exists with stories, scenarios, measurable SCs; no open clarifications | ✅ spec.md, checklist 16/16 | ✅ plan/research/contracts trace to FR/SC IDs |
| II. Test-First | New behaviors get failing tests before code; existing suite stays green | ✅ planned | ✅ R10: tests for NavMenu, Toast, Skeleton, success toasts, focus-first-invalid, dark/320px/reduced-motion e2e written before implementation |
| III. Action Item Integrity | No change to lifecycle, ownership, audit, deletion confirmation | ✅ presentation only (FR-003) | ✅ ConfirmDialog behavior unchanged; data-model has no persistent changes |
| IV. Accessible, Responsive UX | WCAG 2.1 AA, keyboard, labels, mobile, ≤3 interactions, clear errors | ✅ core goal of feature | ✅ contrast table verified (design-system §1); focus ring, 44px targets, mobile nav, axe in both schemes |
| V. Simplicity & Security | Justify added complexity; no secrets; XSS-safe output | ✅ | ✅ 2 dev deps only (user-mandated); no component library; toasts render text only; no `dangerouslySetInnerHTML` |
| Tech constraints | Stack recorded with rationale; API contract in sync | ✅ | ✅ API contract unchanged; Tailwind choice recorded in research R1 |
| Workflow gates | `npm run check` green, review | ✅ | ✅ quickstart V1 |

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/002-tailwind-ui-refresh/
├── plan.md                     # This file
├── research.md                 # Phase 0 — decisions R1–R11
├── data-model.md               # Phase 1 — no persistent changes; UI state (Toast, nav menu)
├── quickstart.md               # Phase 1 — validation scenarios V1–V7
├── contracts/
│   └── design-system.md        # Phase 1 — tokens, contrast, primitives, behavioral UI elements
├── checklists/
│   └── requirements.md         # Spec quality checklist
└── tasks.md                    # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
frontend/
├── package.json                # + tailwindcss, @tailwindcss/vite (devDependencies)
├── vite.config.ts              # + tailwindcss() plugin
├── src/
│   ├── main.tsx                # import './styles/app.css' (replaces tokens.css + global.css)
│   ├── App.tsx                 # wrap in <ToastProvider>
│   ├── styles/
│   │   ├── app.css             # NEW: @import "tailwindcss"; @theme tokens; @layer base/components
│   │   ├── tokens.css          # DELETED
│   │   └── global.css          # DELETED
│   ├── components/
│   │   ├── Layout.tsx          # redesigned header + mobile nav disclosure
│   │   ├── Toast.tsx           # NEW: ToastProvider, useToast, live region
│   │   ├── Skeleton.tsx        # NEW: loading placeholder with role="status"
│   │   ├── icons.tsx           # NEW: ~6 inline SVG icons (aria-hidden)
│   │   └── *.tsx               # restyled (StatusBadge, EmptyState, ConfirmDialog, FormField, FilterBar, …)
│   └── pages/*.tsx             # restyled; loading → Skeleton; mutations → success toasts
└── tests/
    ├── layout.test.tsx         # NEW: mobile nav, aria-current
    ├── toast.test.tsx          # NEW: announce, auto-dismiss, dismiss, max 3
    ├── feedback.test.tsx       # NEW: skeleton status, success toasts, first-invalid focus
    └── (existing tests unchanged)

e2e/
├── a11y.spec.ts                # extended: dark scheme pass on every route
├── ui-refresh.spec.ts          # NEW: mobile menu flow, toast flow, reduced motion
└── (existing specs unchanged)

playwright.config.ts            # + mobile-320 project
```

**Structure Decision**: Existing web-application layout (`frontend/` + `backend/` + `shared/`).
Only `frontend/`, `e2e/`, and `playwright.config.ts` change. Backend and shared packages are
untouched.

## Implementation Phasing (input for /speckit-tasks)

1. **Foundation** — install Tailwind, add `app.css` with tokens/base/components, switch `main.tsx`,
   delete old CSS. App builds; existing tests pass (unstyled screens acceptable only mid-phase).
2. **US1 (P1)** — restyle Layout header (desktop), all pages and components with the design system;
   badges; dialog; tables; auth pages. Extend axe e2e to dark scheme. → MVP.
3. **US2 (P2)** — tests first, then Toast, Skeleton, empty states, success toasts on mutations,
   focus-first-invalid verification, breadcrumbs/primary-action placement.
4. **US3 (P3)** — tests first, then mobile nav disclosure, 320px project, touch targets, table
   column priority, reduced-motion rule.
5. **Polish** — zoom 200% pass, bundle-size check, quickstart V1–V6, user review V7.

## Complexity Tracking

No constitution violations; nothing to justify.
