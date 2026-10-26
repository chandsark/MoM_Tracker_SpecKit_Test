# Contract: UI Routes and Screens

Client-side routes for the React app. Filter state is kept in the URL query string using the same
parameter names as the API list endpoints ([openapi.yaml](./openapi.yaml)), so filtered views are
bookmarkable and the CSV export uses exactly what is on screen.

| Route | Screen | Story / FR | Key behaviour |
|-------|--------|------------|---------------|
| `/register` | Register | FR-029 | Name, email, password; signs in on success |
| `/login` | Sign in | FR-024, FR-029 | Generic error on bad credentials; redirects back to original URL |
| `/` | Home — "My work" | FR-020 | My open action items (overdue first) and my open issues; "New meeting" button |
| `/meetings` | Meetings list | US4, FR-017 | Filters: date range, participant, keyword; empty state with "Clear filters" |
| `/meetings/new` | Create meeting | US1, FR-001/002 | Description, date, participant picker (registered users + external names) |
| `/meetings/:id` | Meeting detail + traceability | US1, US5, FR-021/023 | Header, participants, summary counts, tree of action items → issues; add action item (organizer) |
| `/meetings/:id/edit` | Edit meeting | FR-003 | Organizer only; version-conflict banner on 409 |
| `/action-items` | Action items list | US4, FR-018/027/030 | Filters: assignee (incl. "Me"), status (multi), meeting, due range, overdue; overdue rows highlighted; "Export CSV" |
| `/action-items/:id` | Action item detail | US2, US3, FR-008..016/022 | Breadcrumb Meeting › Action item; status/date edit; comments; issues list; history tab |
| `/issues` | Issues list | US4, FR-019/030 | Filters: status, severity, assignee (incl. "Me"), action item; "Export CSV" |
| `/issues/:id` | Issue detail | US3, US5, FR-015/022 | Breadcrumb Meeting › Action item › Issue; edit; history tab |
| `/deleted` | Deleted items | FR-028 | Organizer's soft-deleted records grouped by deletion; Restore button |

## Cross-cutting UI rules

- Edit, delete, reassign, comment, and raise-issue controls render only when the record's
  `permissions` flags allow them; the API still enforces the rules.
- Delete opens a confirmation dialog listing the impact from `/deletion-impact`.
- Marking Done with open issues shows a confirmation dialog, then re-sends with
  `confirmOpenIssues: true`.
- On `VERSION_CONFLICT`, the form shows the latest values and asks the user to re-apply changes.
- Overdue items show a text label ("Overdue") plus colour — never colour alone (WCAG 1.4.1).
- Every interactive element is keyboard reachable with visible focus; all inputs have labels;
  errors are announced via `aria-live`.
- Layout works from 360 px wide upward.
- Core flows are ≤3 interactions from Home (constitution IV): record meeting (New meeting),
  add action item (meeting → Add), update status (My work → item → status), filter (nav → list).
