// FR-007 / FR-019: badges always carry a text label; colour comes from the design-system variant.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../src/components/StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['action', 'OPEN', 'Open', 'badge-neutral'],
    ['action', 'CANCELLED', 'Cancelled', 'badge-neutral'],
    ['action', 'IN_PROGRESS', 'In Progress', 'badge-info'],
    ['action', 'BLOCKED', 'Blocked', 'badge-warning'],
    ['action', 'DONE', 'Done', 'badge-success'],
    ['issue', 'OPEN', 'Open', 'badge-neutral'],
    ['issue', 'IN_PROGRESS', 'In Progress', 'badge-info'],
    ['issue', 'RESOLVED', 'Resolved', 'badge-success'],
    ['severity', 'LOW', 'Low', 'badge-success'],
    ['severity', 'MEDIUM', 'Medium', 'badge-info'],
    ['severity', 'HIGH', 'High', 'badge-warning'],
    ['severity', 'CRITICAL', 'Critical', 'badge-danger'],
  ] as const)('%s %s → "%s" with %s', (kind, value, label, variant) => {
    // @ts-expect-error -- each row pairs a kind with one of its own values
    render(<StatusBadge kind={kind} value={value} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass('badge', variant);
  });

  it('overdue shows the word "Overdue" plus a decorative clock icon', () => {
    const { container } = render(<StatusBadge kind="overdue" />);
    const badge = screen.getByText('Overdue');
    expect(badge).toHaveClass('badge', 'badge-warning');
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});
