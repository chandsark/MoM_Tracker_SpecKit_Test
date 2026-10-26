import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionItemEditor } from '../src/components/ActionItemEditor';
import { HistoryTab } from '../src/components/HistoryTab';
import { makeItem, noPermissions } from './fixtures';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

const users = {
  items: [
    { id: 'u-arjun', name: 'Arjun', active: true },
    { id: 'u-mei', name: 'Mei', active: true },
  ],
  total: 2,
};

describe('ActionItemEditor', () => {
  it('renders nothing editable without edit permission', () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: signedInUser }) });
    renderWithProviders(<ActionItemEditor item={makeItem({ permissions: noPermissions })} />);
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('shows status and dates for the assignee but not reassignment', () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: signedInUser }) });
    renderWithProviders(<ActionItemEditor item={makeItem()} />);
    const status = screen.getByLabelText('Status');
    expect(status).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Open', 'In Progress', 'Blocked', 'Done', 'Cancelled']),
    );
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-10-20');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-30');
    expect(screen.queryByLabelText('Assignee')).toBeNull();
  });

  it('shows the reassign control to the organizer', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
    });
    renderWithProviders(
      <ActionItemEditor
        item={makeItem({ permissions: { ...noPermissions, canEdit: true, canReassign: true } })}
      />,
    );
    expect(await screen.findByLabelText('Assignee')).toBeInTheDocument();
  });

  it('sends only changed fields with the version', async () => {
    const calls: unknown[] = [];
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'PATCH /api/action-items/i1': ({ body }) => {
        calls.push(body);
        return { status: 200, body: makeItem({ status: 'IN_PROGRESS', version: 2 }) };
      },
    });
    renderWithProviders(<ActionItemEditor item={makeItem()} />);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls).toEqual([{ version: 1, status: 'IN_PROGRESS' }]));
  });

  it('shows the conflict banner with the latest values on 409', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'PATCH /api/action-items/i1': () => ({
        status: 409,
        body: {
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Changed by someone else',
            details: { current: makeItem({ status: 'DONE', dueDate: '2026-11-15', version: 2 }) },
          },
        },
      }),
    });
    renderWithProviders(<ActionItemEditor item={makeItem()} />);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This item was changed by someone else');
    expect(alert).toHaveTextContent('Done');
  });
});

describe('HistoryTab', () => {
  it('lists entries oldest first in plain language', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/history/action-item/i1': () => ({
        status: 200,
        body: [
          {
            id: 'h1',
            action: 'CREATE',
            field: null,
            oldValue: null,
            newValue: null,
            actor: { id: 'o', name: 'Olivia', active: true },
            createdAt: '2026-10-20T09:00:00.000Z',
          },
          {
            id: 'h2',
            action: 'UPDATE',
            field: 'status',
            oldValue: 'OPEN',
            newValue: 'IN_PROGRESS',
            actor: { id: 'a', name: 'Arjun', active: true },
            createdAt: '2026-10-21T09:00:00.000Z',
          },
        ],
      }),
    });
    renderWithProviders(<HistoryTab entityType="action-item" id="i1" />);
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Olivia created this record');
    expect(items[1]).toHaveTextContent('Arjun changed status from Open to In Progress');
  });
});
