# Data Model: Meeting, Action Item & Issue Tracking

**Feature**: `001-meeting-action-tracker` | **Date**: 2026-10-26

Storage: SQLite via Prisma (see [research.md](./research.md) R3). All IDs are string CUIDs.
Timestamps are UTC (`DateTime`). Calendar dates are `YYYY-MM-DD` strings. Enumerated values are
stored as strings and validated by shared Zod enums.

## Entity relationship overview

```text
User 1──* Session
User 1──* Meeting (organizer)
Meeting 1──* MeetingParticipant *──0..1 User      (external participants have no user)
Meeting 1──* ActionItem *──1 User (assignee)
ActionItem 1──* Comment *──1 User (author)
ActionItem 1──* Issue *──1 User (raisedBy)
ChangeHistory *──1 User (actor)    — references any Meeting / ActionItem / Issue by type + id
```

## Entities

### User

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| name | string | required, 1–100 chars, trimmed |
| email | string | required, unique (case-insensitive; stored lower-cased), valid email, ≤254 |
| passwordHash | string | bcrypt hash; never returned by the API |
| createdAt | DateTime | set on create |
| deactivatedAt | DateTime? | set when a user is removed (edge case); history keeps name |

### Session

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK, 32-byte random, base64url — the cookie value |
| userId | string | FK → User |
| expiresAt | DateTime | sliding 7 days |
| createdAt | DateTime | |

### Meeting

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| description | string | required, 1–2000 chars (FR-001) |
| meetingDate | string (date) | required, valid date; future dates allowed |
| organizerId | string | FK → User; set to creator, immutable |
| version | int | optimistic lock, starts at 1 (R6) |
| createdAt / updatedAt | DateTime | |
| deletedAt / deletedById / deletionBatchId | nullable | soft delete (R7) |

Indexes: `meetingDate`, `organizerId`, `deletedAt`.

### MeetingParticipant

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| meetingId | string | FK → Meeting |
| userId | string? | FK → User for registered participants |
| externalName | string? | 1–100 chars for external participants |

Rules: exactly one of `userId` / `externalName` is set; a user appears at most once per meeting
(unique `meetingId + userId`); a meeting MUST have ≥1 participant (FR-001). The organizer is not
automatically a participant but may be added.

### ActionItem

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| meetingId | string | FK → Meeting, required, immutable (FR-004) |
| description | string | required, 1–2000 chars |
| assigneeId | string | FK → User (registered, active), required (FR-005) |
| startDate | string (date) | required |
| dueDate | string (date) | required, MUST be ≥ startDate (FR-006) |
| status | ActionItemStatus | default `OPEN` (FR-007) |
| version | int | optimistic lock |
| createdById | string | FK → User |
| createdAt / updatedAt | DateTime | |
| deletedAt / deletedById / deletionBatchId | nullable | soft delete |

Indexes: `meetingId`, `(assigneeId, status)`, `dueDate`, `deletedAt`.

Derived (not stored): `isOverdue = dueDate < today AND status NOT IN (DONE, CANCELLED)` (FR-027);
`openIssueCount` = issues with status ≠ `RESOLVED` and not deleted.

### Comment

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| actionItemId | string | FK → ActionItem |
| authorId | string | FK → User |
| body | string | required, 1–1000 chars |
| createdAt | DateTime | ordering key (FR-011) |

Comments are append-only in v1 (no edit/delete); they are hidden with their action item when it
is soft-deleted.

### Issue

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| actionItemId | string | FK → ActionItem, required, immutable (FR-013) |
| title | string | required, 1–200 chars |
| description | string | required, 1–2000 chars |
| severity | IssueSeverity | required (FR-012) |
| status | IssueStatus | default `OPEN` (FR-014) |
| raisedById | string | FK → User |
| version | int | optimistic lock |
| createdAt / updatedAt | DateTime | |
| deletedAt / deletedById / deletionBatchId | nullable | soft delete |

Indexes: `(actionItemId, status)`, `severity`, `deletedAt`.

### ChangeHistory

| Field | Type | Rules |
|-------|------|-------|
| id | string | PK |
| entityType | `MEETING` \| `ACTION_ITEM` \| `ISSUE` | |
| entityId | string | |
| action | `CREATE` \| `UPDATE` \| `DELETE` \| `RESTORE` | |
| field | string? | set for `UPDATE` (one row per changed field) |
| oldValue / newValue | string? | display values (e.g., assignee name + id) |
| actorId | string | FK → User |
| createdAt | DateTime | |

Index: `(entityType, entityId, createdAt)`. Written in the same transaction as the change (R8).

## Enumerations

- **ActionItemStatus**: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`
- **IssueStatus**: `OPEN`, `IN_PROGRESS`, `RESOLVED`
- **IssueSeverity**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

## State transitions

### Action item

```text
OPEN ⇄ IN_PROGRESS ⇄ BLOCKED
 │        │            │
 └────────┴────────────┴──→ DONE | CANCELLED
DONE | CANCELLED ──(reopen)──→ OPEN | IN_PROGRESS
```

- Any non-terminal status may move to any other non-terminal status or to a terminal one.
- Moving to `DONE` while `openIssueCount > 0` requires `confirmOpenIssues: true` in the request,
  otherwise 409 `OPEN_ISSUES_CONFIRMATION_REQUIRED` (FR-016).
- `BLOCKED` is only set/cleared manually; issue changes never alter action item status (FR-007).

### Issue

```text
OPEN ⇄ IN_PROGRESS → RESOLVED
RESOLVED ──(reopen)──→ OPEN
```

## Authorization matrix

"Participant" means a registered user listed as a MeetingParticipant of the record's meeting.
All endpoints require a signed-in user (FR-024). Deleted records are visible only to the
organizer (in the "Deleted items" view).

| Action | Organizer | Assignee | Participant | Other signed-in |
|--------|:---------:|:--------:|:-----------:|:---------------:|
| View meetings, action items, issues, history | ✔ | ✔ | ✔ | ✔ |
| Create meeting | ✔ (any user creating becomes organizer) | | | |
| Edit meeting (description, date, participants) | ✔ | | | |
| Create action item in meeting | ✔ | | | |
| Change action item status / start / due date | ✔ | ✔ | | |
| Reassign action item | ✔ | | | |
| Add comment | ✔ | ✔ | ✔ | |
| Raise issue | ✔ | ✔ | ✔ | |
| Edit issue details / status | ✔ | ✔ (of that item) | | |
| Delete / restore meeting, action item, issue | ✔ | | | |

Reassignment immediately moves assignee rights to the new assignee (edge case). Deactivated users
lose all rights; their open action items show a "needs reassignment" flag.

## Validation summary (shared Zod schemas)

- Text fields trimmed; empty after trimming is invalid.
- Dates must parse as real calendar dates in `YYYY-MM-DD`.
- `dueDate >= startDate` on create and on every update that touches either date.
- `assigneeId` must reference an active registered user.
- Update payloads include `version` (integer ≥1).
- Unknown fields are rejected (strict schemas).
