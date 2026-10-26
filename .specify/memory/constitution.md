<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0
- Modified principles (placeholders → defined):
  - [PRINCIPLE_1_NAME] → I. Spec-Driven Development
  - [PRINCIPLE_2_NAME] → II. Test-First (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Action Item Integrity & Traceability
  - [PRINCIPLE_4_NAME] → IV. Accessible, Responsive User Experience
  - [PRINCIPLE_5_NAME] → V. Simplicity & Security by Default
- Added sections: Technology & Data Constraints; Development Workflow & Quality Gates
- Removed sections: none
- Deferred TODOs: none (technology stack intentionally left to /speckit-plan)
-->

# MoM and Action Items Tracker Constitution

## Core Principles

### I. Spec-Driven Development

- Every feature MUST begin as a specification (`/speckit-specify`) describing user value,
  acceptance scenarios, and measurable success criteria before any plan or code exists.
- Implementation MUST trace back to an approved spec, plan, and task list; code without a
  corresponding task MUST NOT be merged.
- Ambiguities MUST be resolved (via `/speckit-clarify`) or explicitly recorded before planning.

Rationale: meeting minutes and action items are workflow-heavy; written specs keep behavior
predictable and reviewable.

### II. Test-First (NON-NEGOTIABLE)

- TDD is mandatory: tests are written, reviewed, and observed to fail before the implementation
  that makes them pass. Red → Green → Refactor is strictly enforced.
- Each user story MUST have acceptance tests derived from its spec scenarios; each API endpoint
  MUST have contract tests; core domain logic MUST have unit tests.
- A failing or skipped test MUST block merge unless the skip is documented with a linked task.

Rationale: tests written first prove the requirement is understood and prevent regressions in
status, ownership, and due-date logic.

### III. Action Item Integrity & Traceability

- Every action item MUST belong to exactly one meeting record (MoM) and MUST have a description,
  an owner, a status, and a creation timestamp; due dates MUST be validated when provided.
- Status changes MUST follow a defined lifecycle (e.g., Open → In Progress → Done / Cancelled)
  and MUST be recorded with who changed it and when.
- Data MUST NOT be silently lost: deletions of meetings or action items MUST be explicit,
  confirmed by the user, and auditable.

Rationale: the product's value is accountability; untraceable or orphaned action items defeat
its purpose.

### IV. Accessible, Responsive User Experience

- The UI MUST be usable on desktop and mobile widths and MUST meet WCAG 2.1 AA for contrast,
  keyboard navigation, and labelled form controls.
- Core flows (record minutes, add action items, update status, filter by owner/status/due date)
  MUST be reachable within three interactions from the main view.
- User-facing errors MUST be clear and actionable; raw stack traces MUST NOT be shown.

Rationale: minutes are captured live in meetings; friction or inaccessibility leads to items
never being recorded.

### V. Simplicity & Security by Default

- Start with the simplest design that satisfies the spec (YAGNI); any added complexity
  (extra services, layers, dependencies) MUST be justified in the plan's Complexity Tracking.
- All input MUST be validated server-side; output MUST be encoded to prevent XSS; queries MUST be
  parameterized.
- Secrets MUST NOT be committed to the repository; authentication and authorization MUST be
  enforced on every endpoint that reads or modifies meeting data.

Rationale: meeting notes often contain sensitive information; a small, secure codebase is easier
to verify and maintain.

## Technology & Data Constraints

- The application is a web app with a separated frontend and backend/API; the concrete stack is
  chosen in `/speckit-plan` and MUST be recorded there with rationale.
- The API contract (endpoints, request/response schemas, error formats) MUST be documented before
  implementation and kept in sync with the code.
- Persistent data MUST use a schema with explicit migrations; schema changes MUST NOT break
  existing records without a migration path.
- Dates and times MUST be stored in UTC and displayed in the user's local time zone.
- Structured logging MUST be used for server-side errors and state changes, excluding sensitive
  meeting content.

## Development Workflow & Quality Gates

- Workflow order: specify → clarify → plan → tasks → analyze → implement.
- Every change MUST pass these gates before merge: all tests green, linting and formatting clean,
  Constitution Check in the plan passing, and review by at least one other person (or a recorded
  self-review checklist for solo work).
- Commits SHOULD be small and reference the task ID they implement.
- Each user story MUST be independently testable and demonstrable before the next is started.

## Governance

- This constitution supersedes all other project practices. Where guidance conflicts, this
  document wins.
- Amendments MUST be made via `/speckit-constitution`, include a Sync Impact Report, and be
  reviewed before adoption; dependent artifacts (plans, specs, tasks) MUST be re-checked for
  compliance after an amendment.
- Versioning follows semantic versioning: MAJOR for removing or redefining principles, MINOR for
  adding principles or materially expanding guidance, PATCH for clarifications and wording.
- Every plan MUST include a Constitution Check; every review MUST verify compliance, and any
  violation MUST be justified in Complexity Tracking or fixed.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
