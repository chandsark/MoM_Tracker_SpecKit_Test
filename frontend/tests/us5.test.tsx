import type { Traceability } from '@mom/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SummaryCounts } from '../src/components/SummaryCounts';
import { TraceabilityTree } from '../src/components/TraceabilityTree';
import { makeIssue, makeItem, noPermissions } from './fixtures';
import { renderWithProviders } from './utils';

function makeTraceability(): Traceability {
  const {
    permissions: _p,
    comments: _c,
    issues: _i,
    ...late
  } = makeItem({
    id: 'i1',
    description: 'Prepare report',
    isOverdue: true,
    openIssueCount: 1,
  });
  const {
    permissions: _p2,
    comments: _c2,
    issues: _i2,
    ...done
  } = makeItem({
    id: 'i2',
    description: 'Book venue',
    status: 'DONE',
  });
  return {
    meeting: {
      id: 'm1',
      description: 'Weekly sync',
      meetingDate: '2026-10-20',
      organizer: { id: 'u-me', name: 'Olivia', active: true },
      participantCount: 1,
      actionItemCount: 2,
      openIssueCount: 1,
      version: 1,
      participants: [],
      permissions: noPermissions,
      createdAt: '2026-10-20T09:00:00.000Z',
      updatedAt: '2026-10-20T09:00:00.000Z',
    },
    summary: {
      actionItemsByStatus: { OPEN: 1, IN_PROGRESS: 0, BLOCKED: 0, DONE: 1, CANCELLED: 0 },
      overdueCount: 1,
      openIssueCount: 1,
    },
    actionItems: [
      { ...late, issues: [makeIssue({ id: 'is1', title: 'Vendor delay', severity: 'CRITICAL' })] },
      { ...done, issues: [] },
    ],
  };
}

describe('TraceabilityTree', () => {
  it('renders meeting → action items → issues as nested lists with links', () => {
    renderWithProviders(<TraceabilityTree data={makeTraceability()} />);
    const tree = screen.getByRole('list', { name: 'Traceability' });
    const meeting = within(tree).getAllByRole('listitem')[0]!;
    expect(meeting).toHaveTextContent('Weekly sync');

    const items = within(meeting).getByRole('list', { name: 'Action items' });
    const report = within(items).getByRole('link', { name: 'Prepare report' });
    expect(report).toHaveAttribute('href', '/action-items/i1');
    const reportRow = report.closest('li')!;
    expect(reportRow).toHaveTextContent('Open');
    expect(reportRow).toHaveTextContent('Overdue');
    expect(reportRow).toHaveTextContent('Arjun');

    const issues = within(reportRow).getByRole('list', { name: 'Issues for Prepare report' });
    expect(within(issues).getByRole('link', { name: 'Vendor delay' })).toHaveAttribute(
      'href',
      '/issues/is1',
    );
    expect(issues).toHaveTextContent('Critical');

    const venueRow = within(items).getByRole('link', { name: 'Book venue' }).closest('li')!;
    expect(venueRow).toHaveTextContent('No issues');
  });

  it('expands and collapses an action item’s issues with an accessible toggle', async () => {
    renderWithProviders(<TraceabilityTree data={makeTraceability()} />);
    const toggle = screen.getByRole('button', { name: /Issues \(1\).*Prepare report/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Issues for Prepare report' })).toBeVisible();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('list', { name: 'Issues for Prepare report' }),
    ).not.toBeInTheDocument();

    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeInTheDocument();
  });

  it('says so when the meeting has no action items', () => {
    renderWithProviders(<TraceabilityTree data={{ ...makeTraceability(), actionItems: [] }} />);
    expect(screen.getByText('No action items yet.')).toBeInTheDocument();
  });
});

describe('SummaryCounts', () => {
  it('shows every status count, overdue and open issues as text', () => {
    renderWithProviders(<SummaryCounts summary={makeTraceability().summary} />);
    const list = screen.getByRole('list', { name: 'Summary' });
    const texts = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(texts).toEqual([
      'Open: 1',
      'In Progress: 0',
      'Blocked: 0',
      'Done: 1',
      'Cancelled: 0',
      'Overdue: 1',
      'Open issues: 1',
    ]);
  });
});
