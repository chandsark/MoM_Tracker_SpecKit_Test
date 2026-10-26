import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from '../src/components/Breadcrumb';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { ConflictBanner } from '../src/components/ConflictBanner';
import { EmptyState } from '../src/components/EmptyState';
import { FormField } from '../src/components/FormField';
import { StatusBadge } from '../src/components/StatusBadge';

describe('FormField', () => {
  it('binds the label to the control and announces errors politely', () => {
    render(
      <FormField label="Title" id="title" error="Required">
        {(a11y) => <input {...a11y} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Title');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText('Required');
    expect(error).toHaveAttribute('aria-live', 'polite');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });
});

describe('ConfirmDialog', () => {
  it('moves focus into the dialog, traps Tab, and closes on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Delete meeting?" onConfirm={vi.fn()} onCancel={onCancel}>
        This also deletes 3 action items.
      </ConfirmDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Delete meeting?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} title="Hidden" onConfirm={vi.fn()} onCancel={vi.fn()}>
        x
      </ConfirmDialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('StatusBadge', () => {
  it('shows the status as text, not colour alone', () => {
    render(<StatusBadge kind="action" value="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('labels severities', () => {
    render(<StatusBadge kind="severity" value="CRITICAL" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('Breadcrumb', () => {
  it('is a labelled nav whose last item is the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[{ label: 'Weekly sync', to: '/meetings/m1' }, { label: 'Prepare report' }]}
        />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Weekly sync' })).toHaveAttribute(
      'href',
      '/meetings/m1',
    );
    expect(screen.getByText('Prepare report')).toHaveAttribute('aria-current', 'page');
  });
});

describe('EmptyState', () => {
  it('shows a message and a Clear filters button', async () => {
    const onClear = vi.fn();
    render(<EmptyState message="No action items match these filters." onClear={onClear} />);
    expect(screen.getByText('No action items match these filters.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('ConflictBanner', () => {
  it('explains the conflict and shows the latest values', () => {
    render(
      <ConflictBanner onReload={vi.fn()}>
        <p>Status: Done</p>
      </ConflictBanner>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This item was changed by someone else');
    expect(screen.getByText('Status: Done')).toBeInTheDocument();
  });
});
