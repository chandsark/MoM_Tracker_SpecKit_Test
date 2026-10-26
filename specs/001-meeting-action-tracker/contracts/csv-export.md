# Contract: CSV Export (FR-030)

Endpoints: `GET /api/action-items/export.csv`, `GET /api/issues/export.csv`
(parameters defined in [openapi.yaml](./openapi.yaml)).

## Format

- RFC 4180: comma separator, CRLF line endings, fields containing `,` `"` CR or LF are quoted,
  embedded quotes doubled.
- UTF-8 with BOM (Excel compatibility).
- Header row always present, even when there are no matching rows.
- Response headers: `Content-Type: text/csv; charset=utf-8`,
  `Content-Disposition: attachment; filename="action-items-YYYYMMDD.csv"` (or `issues-…`), date is
  the export date.
- Rows: exactly the records matching the filters, ignoring pagination; soft-deleted records are
  never included; same sort order as the corresponding list endpoint.
- Formula-injection guard: any cell value starting with `=`, `+`, `-`, `@`, tab, or CR is prefixed
  with a single quote `'`.
- Dates as `YYYY-MM-DD`; timestamps as ISO 8601 UTC.

## Columns — action items

| # | Header | Source |
|---|--------|--------|
| 1 | Action Item ID | id |
| 2 | Description | description |
| 3 | Assignee | assignee.name |
| 4 | Start Date | startDate |
| 5 | Due Date | dueDate |
| 6 | Status | status (display label, e.g., "In Progress") |
| 7 | Overdue | `Yes` / `No` |
| 8 | Open Issues | openIssueCount |
| 9 | Meeting ID | meeting.id |
| 10 | Meeting Date | meeting.meetingDate |
| 11 | Meeting Description | meeting.description |
| 12 | Last Updated | updatedAt |

## Columns — issues

| # | Header | Source |
|---|--------|--------|
| 1 | Issue ID | id |
| 2 | Title | title |
| 3 | Description | description |
| 4 | Severity | severity (display label) |
| 5 | Status | status (display label) |
| 6 | Raised By | raisedBy.name |
| 7 | Raised On | createdAt |
| 8 | Action Item ID | actionItem.id |
| 9 | Action Item | actionItem.description |
| 10 | Action Item Assignee | actionItem.assignee.name |
| 11 | Meeting ID | meeting.id |
| 12 | Meeting Date | meeting.meetingDate |
| 13 | Meeting Description | meeting.description |
