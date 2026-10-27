# Feature Specification: Tailwind UI Refresh

**Feature Branch**: `002-tailwind-ui-refresh`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "tailwind css update - update the ui of this application to tailwind css and make it more attractive and user-friendly user interface."

## User Scenarios & Testing *(mandatory)*

This feature is a visual and usability refresh of the existing MoM and Action Items Tracker. It
changes how every screen looks and feels; it does **not** add, remove, or change any business
behavior (meetings, action items, issues, comments, history, deleted items, sign-in/registration).

### User Story 1 - Consistent, modern look across every screen (Priority: P1)

A team member signs in and moves between My work, Meetings, Action items, Issues, and Deleted
items. Every screen shares one coherent visual language: the same header and navigation, the same
card/panel surfaces, the same button styles, the same typography scale and spacing, and the same
status badge colors. The app feels polished and professional rather than a set of plain pages.

**Why this priority**: The request's core goal is a more attractive interface. A consistent visual
system applied to every screen is the foundation every other improvement builds on, and on its own
it delivers the visible change the user asked for.

**Independent Test**: Visit every route listed in the UI routes contract (login, register, My work,
meetings list/new/detail/edit, action items list/detail, issues list/detail, deleted items, not
found) and confirm each uses the shared header, surfaces, buttons, typography, and badge styles
with no screen left in the old styling.

**Acceptance Scenarios**:

1. **Given** a signed-in user on any screen, **When** they navigate to any other screen, **Then**
   the header, navigation, page title style, buttons, and content surfaces look the same.
2. **Given** a list containing items in each status (e.g., Open, In Progress, Done, Cancelled),
   **When** the list is displayed, **Then** each status shows a distinct, consistently colored badge
   that also carries a text label (color is never the only signal).
3. **Given** the user's device is set to a dark color scheme, **When** they open the app, **Then**
   every screen renders in a matching dark theme with readable contrast.
4. **Given** the refresh is complete, **When** all existing automated tests are run, **Then** they
   pass without changes to the behavior they verify.

---

### User Story 2 - Easier navigation and clearer feedback (Priority: P2)

A user always knows where they are and what just happened. The current section is highlighted in
the navigation, detail pages show breadcrumbs, primary actions (e.g., "New meeting", "Save") stand
out from secondary ones, and the app shows clear loading, empty, success, and error states instead
of blank areas or plain text.

**Why this priority**: "User-friendly" is the second half of the request. Clear orientation and
feedback reduce mistakes and hesitation, but they depend on the shared visual system from Story 1.

**Independent Test**: Navigate to a detail page, trigger a save, trigger a validation error, open a
filter that returns no results, and load a slow list; confirm each produces a clearly styled,
understandable state.

**Acceptance Scenarios**:

1. **Given** the user is in any section, **When** they look at the navigation, **Then** the current
   section is visually highlighted and announced as current to assistive technology.
2. **Given** a list is loading, **When** data has not yet arrived, **Then** a visible loading
   indicator (e.g., placeholder rows or spinner) is shown instead of an empty area.
3. **Given** a list or filter returns no results, **When** it renders, **Then** a friendly empty
   state explains why and, where applicable, offers the next action (e.g., "Create a meeting" or
   "Clear filters").
4. **Given** a form is submitted with invalid input, **When** errors are shown, **Then** each error
   appears next to its field in a clearly styled message and focus moves to the first invalid field.
5. **Given** a destructive action (delete), **When** the user triggers it, **Then** a styled
   confirmation dialog appears with the destructive button visually distinct from Cancel.
6. **Given** a save or delete succeeds, **When** it completes, **Then** the user sees a brief,
   non-blocking confirmation message.

---

### User Story 3 - Comfortable use on phones and tablets (Priority: P3)

A user captures action items on a phone during a meeting. The navigation collapses into a compact
menu, lists reflow into stacked cards or scrollable tables, forms use full-width inputs with
comfortable touch targets, and nothing requires sideways scrolling of the whole page.

**Why this priority**: The constitution already requires mobile usability; the refresh must
preserve and improve it, but desktop use is the primary scenario.

**Independent Test**: Use each core flow (sign in, create meeting, add action item, update status,
filter action items) at a 375px-wide viewport and confirm all controls are reachable and usable
without horizontal page scrolling.

**Acceptance Scenarios**:

1. **Given** a viewport 375px wide, **When** any screen loads, **Then** the page has no horizontal
   scroll and the navigation is available through a menu control.
2. **Given** a touch device, **When** the user taps buttons, links, and form controls, **Then**
   each target is at least 44×44 CSS pixels.
3. **Given** a wide data list (action items, issues) on a narrow screen, **When** it renders,
   **Then** each item remains readable (stacked layout or a contained horizontal scroll area), with
   status, owner, and due date visible.

---

### Edge Cases

- Very long text (meeting titles, action item descriptions, user names) MUST wrap or truncate
  gracefully with the full text still accessible, without breaking layouts.
- Lists with many rows (hundreds) MUST stay readable with existing pagination; styling MUST NOT
  noticeably slow down rendering.
- Overdue action items MUST remain visually flagged (with text, not color alone) in the new design.
- The conflict banner (concurrent edit) and error messages MUST remain prominent and not be
  mistaken for decorative elements.
- Users who enable increased text size (browser zoom up to 200%) MUST still be able to use every
  screen without lost content or overlapping controls.
- Users who request reduced motion MUST NOT see non-essential animations.
- Keyboard-only users MUST see a clearly visible focus indicator on every interactive element,
  including within dialogs, tabs, menus, and the mobile navigation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST apply a single, shared visual design system (colors, typography
  scale, spacing scale, corner radii, shadows, and component styles) to every existing screen and
  component.
- **FR-002**: All previous page-specific and global styling MUST be replaced by the new design
  system so that no screen mixes old and new styles.
- **FR-003**: The refresh MUST NOT change any business behavior, data, routes, or API interactions;
  every existing user flow MUST work exactly as before.
- **FR-004**: The application MUST provide a redesigned header with the product name, primary
  navigation, current-user display, and sign-out, with the active section highlighted and marked
  as current for assistive technology.
- **FR-005**: On narrow viewports (below tablet width), primary navigation MUST collapse into a
  menu control that is keyboard- and screen-reader-operable.
- **FR-006**: Buttons MUST have clearly distinguishable primary, secondary, and destructive variants,
  plus visible hover, focus, active, and disabled states.
- **FR-007**: Status and priority values MUST be shown as consistently colored badges that always
  include a text label.
- **FR-008**: Lists (meetings, action items, issues, deleted items, My work) MUST present items in a
  scannable layout with clear column/field hierarchy and visual separation between items.
- **FR-009**: Detail pages MUST group information into clearly titled sections or cards, with
  primary actions placed consistently.
- **FR-010**: Forms MUST use consistent field styling with visible labels, helper/required
  indicators, and inline error messages associated with their fields.
- **FR-011**: The application MUST show styled loading, empty, and error states for every data
  view in place of blank areas or plain text.
- **FR-012**: The application MUST show a brief, non-blocking confirmation after successful create,
  update, and delete actions.
- **FR-013**: Confirmation dialogs MUST be visually modal, trap focus while open, return focus on
  close, and distinguish the destructive action from Cancel.
- **FR-014**: The sign-in and registration screens MUST be redesigned as a centered, branded
  layout consistent with the rest of the application.
- **FR-015**: The application MUST support both light and dark color schemes, following the user's
  device preference, with all color pairings meeting WCAG 2.1 AA contrast.
- **FR-016**: Every interactive element MUST have a clearly visible keyboard focus indicator, and
  the existing "skip to main content" link MUST be preserved.
- **FR-017**: Layouts MUST be responsive from 320px to wide desktop widths without horizontal page
  scrolling, and touch targets MUST be at least 44×44 CSS pixels.
- **FR-018**: Non-essential animations and transitions MUST be disabled when the user requests
  reduced motion.
- **FR-019**: Overdue action items MUST be visually emphasized using both color and a text or icon
  indicator.

### Key Entities

No new data entities. The refresh restyles presentation of existing entities (Meeting, Action
Item, Issue, Comment, History entry, Deleted item, User) without changing their attributes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of application screens (all routes in the UI routes contract) use the new shared
  design; zero screens retain the previous styling.
- **SC-002**: 100% of existing automated tests pass after the refresh, with no change to the
  behaviors they assert.
- **SC-003**: Every screen passes an automated accessibility check with zero WCAG 2.1 AA contrast
  or labelling violations, in both light and dark schemes.
- **SC-004**: All core flows (sign in, record minutes, add action item, update status, filter by
  owner/status/due date) can be completed at a 375px-wide viewport with no horizontal page scroll.
- **SC-005**: In a review with at least 5 users, at least 80% rate the new interface as more
  attractive and easier to use than the previous one.
- **SC-006**: First-time users locate and start each core flow within 3 interactions from the main
  view on their first attempt in at least 90% of trials.
- **SC-007**: Screens load and become usable no slower than before the refresh (no more than 10%
  regression in perceived load time on the same device).

## Assumptions

- **User-specified constraint**: The user explicitly requested the refresh be built with the
  Tailwind CSS utility framework; this is recorded as a fixed constraint for planning rather than
  an open design choice.
- The refresh is purely presentational: no new features, pages, data fields, or API changes are in
  scope. Behavior-level tests remain the source of truth for correctness.
- The existing product name ("MoM Tracker") is kept; no new logo or brand identity is required. A
  simple text or icon wordmark is acceptable.
- Light/dark mode follows the device preference, as today; a manual theme toggle is out of scope.
- Existing accessibility guarantees (WCAG 2.1 AA, keyboard navigation, labelled controls, skip
  link) from the constitution are preserved and must not regress.
- Supported browsers are the current evergreen browsers (latest two versions of Chrome, Edge,
  Firefox, Safari), matching the existing application.
- Success-confirmation messages (FR-012) are a presentation addition only and do not change
  server behavior.
- Existing UI routes are defined in `specs/001-meeting-action-tracker/contracts/ui-routes.md` and
  remain unchanged.
