# Data Model: Tailwind UI Refresh

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-27

## Persistent data

**None changed.** This feature is presentation-only (spec FR-003). Prisma schema, migrations, API
payloads, and the shared types in `shared/` are untouched. Existing entities (Meeting, Action Item,
Issue, Comment, History entry, Deleted item, User) are only restyled.

## Client-side UI state (new, in-memory only)

These are the only new pieces of state the refresh introduces. None is persisted or sent to the
server.

### Toast

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Unique per toast (incrementing counter) |
| `kind` | `'success' \| 'error' \| 'info'` | Determines icon and color token |
| `message` | string | Plain text, ≤120 chars, rendered as text (never HTML) |
| `createdAt` | number | Used for auto-dismiss timer |

- **Lifecycle**: `shown` → (`4s elapsed` \| `dismiss clicked`) → `removed`.
- **Constraints**: at most 3 visible; a 4th removes the oldest. Timers pause while the toast has
  hover or keyboard focus. All toasts render inside one `aria-live="polite"` region (no
  `role="status"`, to keep existing `status` locators unique).
- **Owner**: `ToastProvider` (React context) mounted once in `App`.

### Mobile navigation menu

| Field | Type | Rules |
|-------|------|-------|
| `open` | boolean | Default `false` |

- **Transitions**: `closed` → (menu button) → `open`; `open` → (menu button \| Escape \| route
  change \| viewport ≥ md) → `closed`. On Escape, focus returns to the menu button.
- **Owner**: local state in `Layout`.

## Design tokens (configuration, not data)

The semantic color, spacing, radius, and shadow tokens are defined in
[contracts/design-system.md](./contracts/design-system.md). They have two value sets (light, dark)
selected by the device color-scheme preference.
