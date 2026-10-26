# Feature Specification: Meeting, Action Item & Issue Tracking with End-to-End Traceability

**Feature Branch**: `001-meeting-action-tracker`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Capture Meeting brief description, date and participants. Then create action items based on meeting with each action item associated to the meeting it originated from. For the action items able o capture assignedd, start date, due date, status and comments. If any action item assingee faces key issues then they can capture issues and associate that to the action item. Assignedd should be able to update action item status, dates and issues.Capability to filter meetigs, action items and issues. User should be able to easily see the end to end traceability."

## Clarifications

### Session 2026-10-26

- Q: Who should be allowed to edit action items and issues? → A: Organizer + assignee edit
  action items and issues; additionally, any registered participant of the meeting can raise
  issues and add comments on that meeting's action items; all other signed-in users are
  read-only.
- Q: When a user deletes a meeting, action item or issue, should the record actually be removed,
  or only hidden? → A: Soft delete: hidden from lists and views but retained; the organizer can
  restore it.
- Q: How should users sign in to the app? → A: Built-in accounts; users self-register with email
  and password.
- Q: When an action item has an unresolved issue, should the action item show a "Blocked"
  status? → A: Yes, a manual "Blocked" status set by the assignee or organizer; the open-issue
  count is still shown.
- Q: Should users be able to export or share meeting minutes and action items outside the app?
  → A: CSV export of filtered action item and issue lists; no printable/PDF summary in v1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record a Meeting and Its Action Items (Priority: P1)

A meeting organizer records a meeting with a brief description, the meeting date, and the list of
participants. From that meeting, the organizer creates one or more action items, each with an
assignee, start date, due date, initial status, and optional comments. Every action item is
permanently linked to the meeting it came from.

**Why this priority**: Capturing meetings and the resulting action items is the core value of the
product; without it nothing else (tracking, issues, traceability) is possible. On its own it
already replaces ad-hoc minutes and spreadsheets.

**Independent Test**: Create a meeting with participants, add three action items to it, then open
the meeting and confirm all three items are listed with their details and each item shows its
originating meeting.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they enter a description, date, and at least one
   participant and save, **Then** the meeting is stored and appears in the meetings list.
2. **Given** an existing meeting, **When** the user adds an action item with description,
   assignee, start date, due date, and status, **Then** the item is saved and shown under that
   meeting.
3. **Given** an action item being created, **When** the due date is earlier than the start date,
   **Then** the system rejects the save and explains the date conflict.
4. **Given** an action item being created, **When** no meeting is selected, **Then** the system
   does not allow the item to be saved.
5. **Given** an existing action item, **When** a user adds a comment, **Then** the comment is
   stored with its author and timestamp and displayed in chronological order.

---

### User Story 2 - Assignee Updates Action Item Progress (Priority: P2)

An assignee opens the action items assigned to them and updates the status, start date, or due
date as work progresses, adding comments to explain changes. Every change is recorded with who
made it and when.

**Why this priority**: Action items only deliver accountability if they are kept up to date by
the people doing the work.

**Independent Test**: Sign in as an assignee, change an item's status from Open to In Progress
and move its due date, then confirm the item reflects the new values and its history shows both
changes with the assignee's name and time.

**Acceptance Scenarios**:

1. **Given** an action item assigned to the user, **When** they change its status, **Then** the
   new status is saved and a history entry records the old value, new value, user, and time.
2. **Given** an action item assigned to the user, **When** they change the start or due date,
   **Then** the change is saved, validated (due date not before start date), and recorded in the
   history.
3. **Given** a user who is neither the assignee nor the meeting organizer, **When** they attempt to
   change the action item's status, dates, or assignee, **Then** the system prevents the change.
4. **Given** a registered participant of the meeting who is not the assignee, **When** they add a
   comment to one of the meeting's action items, **Then** the comment is saved; **When** a
   non-participant tries the same, **Then** the system prevents it.
5. **Given** an action item in status Done or Cancelled, **When** the assignee reopens it,
   **Then** the status returns to Open or In Progress and the change is recorded.

---

### User Story 3 - Raise and Manage Issues on an Action Item (Priority: P3)

When an assignee (or another registered participant of the meeting) faces a key issue (a
blocker, risk, or dependency) on an action item, they log an issue against that action item with
a title, description, and severity. The assignee or organizer updates the issue's status and
details as it is worked on until it is resolved.

**Why this priority**: Issues make blockers visible, but the product is still useful without
them; they build on action items.

**Independent Test**: As an assignee, add an issue to an action item, update its description,
then mark it Resolved, and confirm the issue appears under the action item with the correct
status and history.

**Acceptance Scenarios**:

1. **Given** an action item assigned to the user, **When** they create an issue with title,
   description, and severity, **Then** the issue is saved with status Open and linked to that
   action item.
2. **Given** an open issue, **When** the assignee updates its details or status to Resolved,
   **Then** the change is saved and recorded in the issue's history.
3. **Given** an action item with one or more open issues, **When** anyone views the action item,
   **Then** the number of open issues is clearly indicated.
4. **Given** an action item with an open issue, **When** the assignee sets its status to Blocked,
   **Then** the item shows as Blocked in all lists and filters; resolving the issue does not
   change the status until the assignee changes it.
5. **Given** a registered participant of the meeting who is not the assignee, **When** they raise
   an issue on one of the meeting's action items, **Then** the issue is saved with them as the
   raiser; **When** a signed-in user who is not a participant tries the same, **Then** the system
   prevents it.

---

### User Story 4 - Filter Meetings, Action Items and Issues (Priority: P4)

Users filter each list to find what they need: meetings by date range, participant, or keyword;
action items by assignee, status, due date range, overdue state, or meeting; issues by status,
severity, assignee, or action item.

**Why this priority**: Filtering becomes essential as data grows, but small teams can manage
with plain lists at first.

**Independent Test**: With seeded data, apply "assignee = X, status = Open, overdue" on action
items and confirm only matching items are shown; clear filters and confirm the full list returns.

**Acceptance Scenarios**:

1. **Given** a list of meetings, **When** the user filters by a date range, **Then** only meetings
   within that range are shown.
2. **Given** a list of action items, **When** the user combines assignee and status filters,
   **Then** only items matching both are shown.
3. **Given** a list of action items, **When** the user selects "overdue", **Then** only items past
   their due date and not Done or Cancelled are shown.
4. **Given** a filter that matches nothing, **When** it is applied, **Then** an empty-state
   message is shown with an option to clear filters.
5. **Given** a filtered list of action items or issues, **When** the user exports it, **Then** a
   CSV file is downloaded containing exactly the filtered rows, including the originating meeting
   (and parent action item for issues).

---

### User Story 5 - View End-to-End Traceability (Priority: P5)

From any meeting, action item, or issue, a user can see the full chain: meeting → its action
items → each item's issues, and navigate up or down the chain in one step.

**Why this priority**: Traceability ties everything together for reviews and follow-up meetings,
and relies on the earlier stories being in place.

**Independent Test**: Open an issue, navigate to its parent action item and then to the
originating meeting; from the meeting, view a tree of all its action items and their issues with
statuses.

**Acceptance Scenarios**:

1. **Given** a meeting with action items and issues, **When** the user opens the meeting's
   traceability view, **Then** all its action items and their issues are shown in a hierarchy
   with status, assignee, and due date.
2. **Given** an issue, **When** the user views it, **Then** the parent action item and originating
   meeting are shown and reachable in one click each.
3. **Given** a meeting's traceability view, **When** the user looks at the summary, **Then** they
   see counts of action items by status and the number of open issues.

---

### Edge Cases

- A participant or assignee is removed from the system: their historical records remain visible
  by name, and their open items are flagged as needing reassignment.
- An action item is reassigned: the new assignee gains edit rights and the previous one loses
  them; the reassignment is recorded in history.
- A meeting with action items is deleted: deletion requires explicit confirmation listing the
  action items and issues that would be affected; the meeting and its dependents are soft-deleted
  together and restored together.
- A deleted action item or issue is restored while its parent is still deleted: the system
  prevents this and asks the organizer to restore the parent first.
- An action item is marked Done while it still has open issues: the system warns the user and
  requires confirmation.
- Two users edit the same action item at the same time: the second save is told the item changed
  and is shown the latest version rather than silently overwriting it.
- A meeting date in the future (planned meeting) is allowed; a meeting with no participants is not.
- Very long descriptions or comments are accepted up to a defined limit, with the limit shown.

## Requirements *(mandatory)*

### Functional Requirements

**Meetings**

- **FR-001**: Users MUST be able to create a meeting with a brief description (required), a
  meeting date (required), and one or more participants (required).
- **FR-002**: Participants MUST be selectable from registered users; users MAY also add external
  participants by name.
- **FR-003**: The meeting organizer MUST be able to edit a meeting's description, date, and
  participants; every change MUST be recorded with user and time.

**Action Items**

- **FR-004**: Users MUST be able to create action items only from within an existing meeting;
  every action item MUST be linked to exactly one meeting.
- **FR-005**: Each action item MUST capture a description, an assignee (a registered user), a
  start date, a due date, a status, and zero or more comments.
- **FR-006**: The system MUST reject an action item whose due date is earlier than its start date.
- **FR-007**: Action item status MUST be one of: Open, In Progress, Blocked, Done, Cancelled; new
  items default to Open. Blocked is set and cleared manually by the assignee or organizer and is
  never changed automatically by issue activity.
- **FR-008**: The assignee and the meeting organizer MUST be able to update an action item's
  status, start date, and due date; registered participants of the meeting MUST be able to add
  comments; all other signed-in users MUST have read-only access.
- **FR-009**: The meeting organizer MUST be able to reassign an action item to a different
  registered user.
- **FR-010**: Every change to an action item MUST be recorded in its history with the field
  changed, old value, new value, user, and timestamp.
- **FR-011**: Comments MUST store author and timestamp and be displayed in chronological order.

**Issues**

- **FR-012**: The assignee, the meeting organizer, and registered participants of the meeting
  MUST be able to create issues linked to that meeting's action items, each with a title,
  description, and severity (Low, Medium, High, Critical); the raiser MUST be recorded.
- **FR-013**: Every issue MUST be linked to exactly one action item.
- **FR-014**: Issue status MUST be one of: Open, In Progress, Resolved; new issues default to Open.
- **FR-015**: The action item's assignee and the meeting organizer MUST be able to update an
  issue's details and status; all changes MUST be recorded with user and timestamp.
- **FR-016**: The system MUST warn and require confirmation when an action item with open issues
  is marked Done.

**Filtering**

- **FR-017**: Users MUST be able to filter meetings by date range, participant, and keyword in
  the description.
- **FR-018**: Users MUST be able to filter action items by assignee, status, meeting, due date
  range, and overdue state, and combine these filters.
- **FR-019**: Users MUST be able to filter issues by status, severity, assignee, and action item,
  and combine these filters.
- **FR-020**: Users MUST be able to quickly view "my action items" and "my open issues".
- **FR-030**: Users MUST be able to export the currently filtered action item list and issue list
  as CSV files; each row MUST include its traceability columns (meeting description and date, and
  for issues the parent action item), and deleted records MUST NOT be exported.

**Traceability**

- **FR-021**: The system MUST provide a traceability view for each meeting showing all its action
  items and each item's issues in a hierarchy with status, assignee, and due date.
- **FR-022**: Every action item and issue view MUST show and link to its parent records (issue →
  action item → meeting).
- **FR-023**: The traceability view MUST summarize action item counts by status and the number of
  open issues for the meeting.

**General**

- **FR-024**: Only signed-in users MUST be able to view or change meetings, action items, and
  issues.
- **FR-029**: Users MUST be able to self-register with a name, a unique email address, and a
  password, and then sign in and sign out; each email address MUST belong to at most one account.
- **FR-025**: Deleting a meeting, action item, or issue MUST require explicit confirmation showing
  all dependent records affected, and the deletion MUST be recorded in the audit history.
- **FR-028**: Deletion MUST be a soft delete: deleted records (and their dependents) MUST be
  hidden from all lists, filters, and traceability views but retained; only the meeting organizer
  MUST be able to delete records and to view and restore deleted records of their meetings.
- **FR-026**: The system MUST detect conflicting concurrent edits and prevent silent overwrites.
- **FR-027**: Overdue action items (past due date and not Done or Cancelled) MUST be visibly
  highlighted in all lists.

### Key Entities

- **User**: A registered person who can organize meetings, be a participant, be assigned action
  items, and raise issues. Key attributes: name, email (unique, used to sign in), password
  credential.
- **Meeting**: A recorded meeting. Attributes: brief description, meeting date, organizer,
  participants, deleted flag. Has many action items. Action items and issues also carry a deleted
  flag.
- **Participant**: A person who attended a meeting; either a registered user or an external name.
- **Action Item**: A task arising from a meeting. Attributes: description, assignee, start date,
  due date, status. Belongs to one meeting; has many comments and issues.
- **Comment**: A note on an action item. Attributes: text, author, timestamp.
- **Issue**: A key problem or blocker raised against an action item. Attributes: title,
  description, severity, status, raised by, created date. Belongs to one action item.
- **Change History Entry**: An audit record of a create, update, delete, or restore on a meeting,
  action item, or issue. Attributes: record changed, field, old value, new value, user, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can record a meeting with participants and three action items in under 5
  minutes.
- **SC-002**: An assignee can update an action item's status or dates in under 30 seconds and in
  no more than three interactions from the main view.
- **SC-003**: From any issue, a user reaches the originating meeting in two clicks or fewer, and
  from any meeting sees its complete action item and issue hierarchy on one screen.
- **SC-004**: Filtered results appear in under 2 seconds for up to 10,000 action items.
- **SC-005**: 100% of action items and issues are linked to a parent record; no orphaned records
  exist.
- **SC-006**: 100% of status, date, and assignment changes are present in the change history.
- **SC-007**: 90% of first-time users successfully create a meeting, add an action item, and log
  an issue without assistance.

## Assumptions

- Users sign in with built-in email-and-password accounts; single sign-on, password reset by
  email, and profile management beyond name are out of scope for v1.
- Any signed-in user can create a meeting and becomes its organizer.
- Registered participants who raise an issue but are not the assignee or organizer can view it
  but cannot change its status or details after creation.
- All signed-in users can view all meetings, action items, and issues (single team or
  organization); finer-grained visibility is out of scope for v1.
- Assignees must be registered users so they can sign in to update their items; external
  participants cannot be assigned action items.
- Email or push notifications (e.g., reminders for due dates) are out of scope for v1.
- Attachments on meetings, action items, or issues are out of scope for v1.
- Printable/PDF meeting summaries and CSV export of the meetings list are out of scope for v1;
  only action item and issue lists are exportable.
- Descriptions are limited to 2,000 characters and comments to 1,000 characters.
- Dates are calendar dates without times; "overdue" means the due date is before today in the
  user's local time zone.
- The application is used in a modern web browser on desktop or mobile.
