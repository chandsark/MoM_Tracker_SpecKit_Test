import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionItemsListPage } from '../src/pages/ActionItemsListPage';
import { IssuesListPage } from '../src/pages/IssuesListPage';
import { MeetingsListPage } from '../src/pages/MeetingsListPage';
import { makeIssue, makeItem } from './fixtures';
import { mockFetch, renderWithProviders, signedInUser, type MockRequest } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders the current URL search string so tests can assert on the filter state in the URL. */
function LocationProbe() {
  const { search } = useLocation();
  return <output data-testid="location">{search}</output>;
}
const urlParams = () => new URLSearchParams(screen.getByTestId('location').textContent ?? '');

const users = {
  items: [
    { id: 'u-arjun', name: 'Arjun', active: true },
    { id: 'u-mei', name: 'Mei', active: true },
  ],
  total: 2,
};
const meetings = {
  items: [
    {
      id: 'm1',
      description: 'Weekly sync',
      meetingDate: '2026-10-20',
      organizer: { id: 'u-me', name: 'Olivia', active: true },
      participantCount: 2,
      actionItemCount: 1,
      openIssueCount: 0,
    },
  ],
  total: 1,
};

function actionItemRoutes(requests: URL[], respond?: (url: URL) => object) {
  return mockFetch({
    'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
    'GET /api/users': () => ({ status: 200, body: users }),
    'GET /api/meetings': () => ({ status: 200, body: meetings }),
    'GET /api/action-items': ({ url }: MockRequest) => {
      requests.push(url);
      return {
        status: 200,
        body: respond?.(url) ?? {
          items: [makeItem({ isOverdue: true }), makeItem({ id: 'i2', description: 'Book venue' })],
          total: 2,
        },
      };
    },
  });
}

describe('Action items FilterBar', () => {
  it('reads filters from the URL and sends them to the API', async () => {
    const requests: URL[] = [];
    actionItemRoutes(requests);
    renderWithProviders(<ActionItemsListPage />, {
      route: '/action-items?status=OPEN,BLOCKED&overdue=true',
    });

    const statuses = screen.getByRole('group', { name: 'Status' });
    expect(within(statuses).getByLabelText('Open')).toBeChecked();
    expect(within(statuses).getByLabelText('Blocked')).toBeChecked();
    expect(within(statuses).getByLabelText('Done')).not.toBeChecked();
    expect(screen.getByLabelText('Overdue only')).toBeChecked();

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    const last = requests.at(-1)!;
    expect(last.searchParams.get('status')).toBe('OPEN,BLOCKED');
    expect(last.searchParams.get('overdue')).toBe('true');
  });

  it('writes changed filters to the URL using API parameter names', async () => {
    const requests: URL[] = [];
    actionItemRoutes(requests);
    renderWithProviders(
      <>
        <ActionItemsListPage />
        <LocationProbe />
      </>,
      { route: '/action-items' },
    );

    await userEvent.click(
      within(screen.getByRole('group', { name: 'Status' })).getByLabelText('In Progress'),
    );
    await userEvent.selectOptions(await screen.findByLabelText('Assignee'), 'me');
    await userEvent.type(screen.getByLabelText('Due from'), '2026-10-01');

    await waitFor(() => {
      const params = urlParams();
      expect(params.get('status')).toBe('IN_PROGRESS');
      expect(params.get('assigneeId')).toBe('me');
      expect(params.get('dueFrom')).toBe('2026-10-01');
    });
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('assigneeId')).toBe('me'));
  });

  it('labels overdue rows with text and shows the total', async () => {
    actionItemRoutes([]);
    renderWithProviders(<ActionItemsListPage />, { route: '/action-items' });
    const row = (await screen.findByRole('link', { name: 'Prepare report' })).closest('tr')!;
    expect(row).toHaveTextContent('Overdue');
    expect(screen.getByText('2 action items')).toBeInTheDocument();
  });

  it('shows an empty state whose Clear filters button resets the URL', async () => {
    actionItemRoutes([], (url) =>
      url.searchParams.has('q') ? { items: [], total: 0 } : { items: [makeItem()], total: 1 },
    );
    renderWithProviders(
      <>
        <ActionItemsListPage />
        <LocationProbe />
      </>,
      { route: '/action-items?q=nothing&status=DONE' },
    );
    const empty = await screen.findByText('No action items match these filters.');
    await userEvent.click(
      within(empty.closest('.empty-state') as HTMLElement).getByRole('button', {
        name: 'Clear filters',
      }),
    );
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(''));
    expect(await screen.findByRole('link', { name: 'Prepare report' })).toBeInTheDocument();
  });

  it('builds the Export CSV link from the current filters, without pagination', async () => {
    actionItemRoutes([]);
    renderWithProviders(<ActionItemsListPage />, {
      route: '/action-items?assigneeId=me&status=OPEN&page=2',
    });
    const link = await screen.findByRole('link', { name: 'Export CSV' });
    const href = new URL(link.getAttribute('href')!, 'http://localhost');
    expect(href.pathname).toBe('/api/action-items/export.csv');
    expect(href.searchParams.get('assigneeId')).toBe('me');
    expect(href.searchParams.get('status')).toBe('OPEN');
    expect(href.searchParams.get('today')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(href.searchParams.has('page')).toBe(false);
  });
});

describe('Issues list filters', () => {
  it('filters by severity and carries filters into the export link', async () => {
    const requests: URL[] = [];
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
      'GET /api/issues': ({ url }) => {
        requests.push(url);
        return { status: 200, body: { items: [makeIssue()], total: 1 } };
      },
    });
    renderWithProviders(<IssuesListPage />, { route: '/issues' });
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Severity' })).getByLabelText('Critical'),
    );
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('severity')).toBe('CRITICAL'));
    const href = (await screen.findByRole('link', { name: 'Export CSV' })).getAttribute('href')!;
    expect(href).toBe('/api/issues/export.csv?severity=CRITICAL');
  });

  it('shows an action item filter chip that can be removed', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
      'GET /api/issues': () => ({ status: 200, body: { items: [makeIssue()], total: 1 } }),
    });
    renderWithProviders(
      <>
        <IssuesListPage />
        <LocationProbe />
      </>,
      { route: '/issues?actionItemId=i1' },
    );
    await userEvent.click(await screen.findByRole('button', { name: /Remove action item filter/ }));
    await waitFor(() => expect(urlParams().has('actionItemId')).toBe(false));
  });
});

describe('Meetings list filters', () => {
  it('sends date range, participant and keyword filters', async () => {
    const requests: URL[] = [];
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
      'GET /api/meetings': ({ url }) => {
        requests.push(url);
        return { status: 200, body: meetings };
      },
    });
    renderWithProviders(<MeetingsListPage />, { route: '/meetings?from=2026-01-01&to=2026-12-31' });
    expect(screen.getByLabelText('From')).toHaveValue('2026-01-01');
    await screen.findByRole('option', { name: 'Mei' });
    await userEvent.selectOptions(screen.getByLabelText('Participant'), 'u-mei');
    await userEvent.type(screen.getByLabelText('Keyword'), 'sync');
    await waitFor(() => {
      const last = requests.at(-1)!.searchParams;
      expect(last.get('from')).toBe('2026-01-01');
      expect(last.get('to')).toBe('2026-12-31');
      expect(last.get('participantId')).toBe('u-mei');
      expect(last.get('q')).toBe('sync');
    });
  });
});
