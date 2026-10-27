// US2 — clearer feedback: skeleton loading, focus on the first invalid field, success toasts,
// empty-state next step, and a visually distinct destructive confirm (FR-011..FR-013).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteButton } from '../src/components/DeleteButton';
import { MeetingForm } from '../src/components/MeetingForm';
import { AppRoutes } from '../src/routes';
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

describe('loading state', () => {
  it('shows skeleton rows inside a "Loading…" status while a list is pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes('/api/auth/me'))
          return new Response(JSON.stringify(signedInUser), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        return new Promise<Response>(() => {}); // never resolves
      }),
    );
    renderWithProviders(<AppRoutes />, { route: '/action-items' });
    const status = await screen.findByRole('status', { name: /^Loading/ });
    expect(status.querySelectorAll('[data-skeleton]').length).toBeGreaterThan(0);
  });
});

describe('form errors', () => {
  it('moves focus to the first invalid field on submit', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
    });
    renderWithProviders(<MeetingForm submitLabel="Save meeting" onSubmit={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save meeting' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Description')));
  });
});

describe('success toasts', () => {
  it('confirms "Meeting created" after creating a meeting', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
      'POST /api/meetings': () => ({ status: 201, body: { id: 'm9' } }),
    });
    renderWithProviders(<AppRoutes />, { route: '/meetings/new' });
    await userEvent.type(await screen.findByLabelText('Description'), 'Sprint planning');
    fireEvent.change(screen.getByLabelText('Meeting date'), { target: { value: '2026-10-20' } });
    await userEvent.type(screen.getByLabelText('External participant name'), 'Vendor Rep');
    await userEvent.click(screen.getByRole('button', { name: 'Add external participant' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save meeting' }));
    expect(await screen.findByText('Meeting created')).toBeInTheDocument();
  });

  it('confirms "Deleted" after deleting a record', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'DELETE /api/issues/is1': () => ({ status: 204 }),
    });
    renderWithProviders(
      <DeleteButton entityType="issue" id="is1" version={1} redirectTo="/issues" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete issue' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this issue?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });
});

describe('destructive confirmation', () => {
  it('styles Delete as destructive and Cancel as secondary', async () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: signedInUser }) });
    renderWithProviders(
      <DeleteButton entityType="issue" id="is1" version={1} redirectTo="/issues" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete issue' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this issue?' });
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveClass('btn-secondary');
  });
});

describe('empty state', () => {
  it('offers "New meeting" when there are no meetings and no filters', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
      'GET /api/users': () => ({ status: 200, body: users }),
      'GET /api/meetings': () => ({ status: 200, body: { items: [], total: 0 } }),
    });
    const { container } = renderWithProviders(<AppRoutes />, { route: '/meetings' });
    await screen.findByText('No meetings yet.');
    const empty = container.querySelector<HTMLElement>('.empty-state')!;
    expect(within(empty).getByRole('link', { name: 'New meeting' })).toHaveAttribute(
      'href',
      '/meetings/new',
    );
  });
});
