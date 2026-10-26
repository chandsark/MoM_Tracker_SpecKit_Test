import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteButton } from '../src/components/DeleteButton';
import { DeletedPage } from '../src/pages/DeletedPage';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

function PathProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

describe('DeleteButton', () => {
  it('lists the deletion impact, deletes at the confirmed version, then navigates', async () => {
    const deletes: URL[] = [];
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/meetings/m1/deletion-impact': () => ({
        status: 200,
        body: {
          actionItemCount: 2,
          issueCount: 1,
          actionItems: [
            {
              id: 'i1',
              description: 'Prepare report',
              issueCount: 1,
              issues: [{ id: 'is1', title: 'Printer is broken' }],
            },
            { id: 'i2', description: 'Book venue', issueCount: 0, issues: [] },
          ],
        },
      }),
      'DELETE /api/meetings/m1': ({ url }) => {
        deletes.push(url);
        return { status: 204 };
      },
    });
    renderWithProviders(
      <>
        <DeleteButton entityType="meeting" id="m1" version={3} redirectTo="/meetings" />
        <PathProbe />
      </>,
      { route: '/meetings/m1' },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete meeting' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this meeting?' });
    expect(await within(dialog).findByText(/2 action items and 1 issue/)).toBeInTheDocument();
    const items = within(dialog).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Prepare report');
    expect(
      within(items[0]!).getByRole('list', { name: 'Issues on Prepare report' }),
    ).toHaveTextContent('Printer is broken');
    expect(dialog).toHaveTextContent('Book venue');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/meetings'));
    expect(deletes[0]!.searchParams.get('version')).toBe('3');
  });

  it('cancels without deleting', async () => {
    const del = vi.fn(() => ({ status: 204 }));
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'DELETE /api/issues/is1': del,
    });
    renderWithProviders(
      <DeleteButton entityType="issue" id="is1" version={1} redirectTo="/action-items/i1" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete issue' }));
    expect(screen.getByRole('dialog', { name: 'Delete this issue?' })).toHaveTextContent(
      'Nothing else is deleted with it.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(del).not.toHaveBeenCalled();
  });

  it('names the issues deleted with an action item and reports a version conflict', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'DELETE /api/action-items/i1': () => ({
        status: 409,
        body: {
          error: { code: 'VERSION_CONFLICT', message: 'This record was changed by someone else.' },
        },
      }),
    });
    renderWithProviders(
      <DeleteButton
        entityType="action-item"
        id="i1"
        version={1}
        redirectTo="/meetings/m1"
        issues={[
          { id: 'is1', title: 'Printer is broken' },
          { id: 'is2', title: 'Venue unavailable' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete action item' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this action item?' });
    expect(dialog).toHaveTextContent('This also deletes 2 issues:');
    const issues = within(dialog).getByRole('list', { name: 'Issues deleted with it' });
    expect(
      within(issues)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Printer is broken', 'Venue unavailable']);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('changed by someone else');
  });
});

describe('DeletedPage', () => {
  const record = {
    entityType: 'meeting',
    id: 'm1',
    label: 'Weekly sync',
    deletedAt: '2026-10-25T10:00:00.000Z',
    deletedBy: { id: 'u-me', name: 'Olivia', active: true },
    deletionBatchId: 'b1',
    dependentCount: 3,
  };

  it('lists deleted records with their related count and restores one', async () => {
    let restored = false;
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/deleted': () => ({ status: 200, body: restored ? [] : [record] }),
      'POST /api/deleted/meeting/m1/restore': () => {
        restored = true;
        return { status: 204 };
      },
    });
    renderWithProviders(<DeletedPage />);
    const item = (await screen.findByText('Weekly sync', { selector: 'strong' })).closest('li')!;
    expect(item).toHaveTextContent('Meeting');
    expect(item).toHaveTextContent('3 related records');
    expect(item).toHaveTextContent('Olivia');
    await userEvent.click(within(item).getByRole('button', { name: /Restore/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Restored “Weekly sync”');
    expect(await screen.findByText('Nothing has been deleted.')).toBeInTheDocument();
  });

  it('explains when the parent must be restored first', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/deleted': () => ({
        status: 200,
        body: [
          {
            ...record,
            entityType: 'action-item',
            id: 'i1',
            label: 'Prepare report',
            dependentCount: 0,
          },
        ],
      }),
      'POST /api/deleted/action-item/i1/restore': () => ({
        status: 409,
        body: {
          error: {
            code: 'PARENT_DELETED',
            message: 'Restore the meeting or action item this belongs to first.',
          },
        },
      }),
    });
    renderWithProviders(<DeletedPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Restore/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Restore the meeting or action item this belongs to first.',
    );
  });
});
