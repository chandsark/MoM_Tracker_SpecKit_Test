import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionItemEditor } from '../src/components/ActionItemEditor';
import { IssueForm } from '../src/components/IssueForm';
import { IssueList } from '../src/components/IssueList';
import { makeIssue, makeItem } from './fixtures';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IssueForm', () => {
  it('validates title, description and severity', async () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: signedInUser }) });
    const onSubmit = vi.fn();
    renderWithProviders(<IssueForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Raise issue' }));
    expect(await screen.findByText('Choose a severity')).toBeInTheDocument();
    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid issue', async () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: signedInUser }) });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<IssueForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Vendor delay');
    await userEvent.type(screen.getByLabelText('Description'), 'Parts arrive next week');
    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'HIGH');
    await userEvent.click(screen.getByRole('button', { name: 'Raise issue' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Vendor delay',
        description: 'Parts arrive next week',
        severity: 'HIGH',
      }),
    );
  });
});

describe('IssueList', () => {
  it('shows severity and status as text badges with a link to each issue', () => {
    renderWithProviders(
      <IssueList
        issues={[
          makeIssue(),
          makeIssue({ id: 'is2', title: 'Old problem', status: 'RESOLVED', severity: 'LOW' }),
        ]}
      />,
    );
    const rows = within(screen.getByRole('list', { name: 'Issues' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('High');
    expect(rows[0]).toHaveTextContent('Open');
    expect(within(rows[0]!).getByRole('link', { name: 'Blocked on data' })).toHaveAttribute(
      'href',
      '/issues/is1',
    );
    expect(rows[1]).toHaveTextContent('Resolved');
    expect(rows[1]).toHaveTextContent('Low');
  });
});

describe('Marking Done with open issues', () => {
  it('asks for confirmation, then resends with confirmOpenIssues', async () => {
    const bodies: Record<string, unknown>[] = [];
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'PATCH /api/action-items/i1': ({ body }) => {
        const b = body as Record<string, unknown>;
        bodies.push(b);
        if (!b.confirmOpenIssues) {
          return {
            status: 409,
            body: {
              error: {
                code: 'OPEN_ISSUES_CONFIRMATION_REQUIRED',
                message: 'Open issues',
                details: { openIssueCount: 2 },
              },
            },
          };
        }
        return { status: 200, body: makeItem({ status: 'DONE', version: 2 }) };
      },
    });
    renderWithProviders(<ActionItemEditor item={makeItem({ openIssueCount: 2 })} />);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'DONE');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mark as Done with open issues?' });
    expect(dialog).toHaveTextContent('2 open issues');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as Done' }));
    await waitFor(() =>
      expect(bodies).toEqual([
        { version: 1, status: 'DONE' },
        { version: 1, status: 'DONE', confirmOpenIssues: true },
      ]),
    );
  });
});
