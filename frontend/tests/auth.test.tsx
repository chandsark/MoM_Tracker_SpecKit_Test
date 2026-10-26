import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/routes';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

const unauthenticated = () => ({
  status: 401,
  body: { error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } },
});

describe('Register page', () => {
  it('validates fields with the shared schema before calling the API', async () => {
    const fetch = mockFetch({ 'GET /api/auth/me': unauthenticated });
    renderWithProviders(<AppRoutes />, { route: '/register' });
    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/register'))).toBe(false);
  });

  it('shows the server EMAIL_TAKEN error', async () => {
    mockFetch({
      'GET /api/auth/me': unauthenticated,
      'POST /api/auth/register': () => ({
        status: 409,
        body: {
          error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
        },
      }),
    });
    renderWithProviders(<AppRoutes />, { route: '/register' });
    await userEvent.type(await screen.findByLabelText('Name'), 'Olivia');
    await userEvent.type(screen.getByLabelText('Email'), 'olivia@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument();
  });
});

describe('Login page', () => {
  it('shows a generic error on 401', async () => {
    mockFetch({
      'GET /api/auth/me': unauthenticated,
      'POST /api/auth/login': () => ({
        status: 401,
        body: {
          error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
        },
      }),
    });
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText('Email'), 'olivia@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
  });

  it('redirects to the originally requested page after signing in', async () => {
    let signedIn = false;
    mockFetch({
      'GET /api/auth/me': () =>
        signedIn ? { status: 200, body: signedInUser } : unauthenticated(),
      'POST /api/auth/login': () => {
        signedIn = true;
        return { status: 200, body: signedInUser };
      },
      'GET /api/meetings': () => ({ status: 200, body: { items: [], total: 0 } }),
      'GET /api/users': () => ({ status: 200, body: { items: [], total: 0 } }),
    });
    renderWithProviders(<AppRoutes />, { route: '/login?next=%2Fmeetings' });
    await userEvent.type(await screen.findByLabelText('Email'), 'olivia@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Meetings' })).toBeInTheDocument();
  });

  it('ignores an off-site redirect target', async () => {
    let signedIn = false;
    mockFetch({
      'GET /api/auth/me': () =>
        signedIn ? { status: 200, body: signedInUser } : unauthenticated(),
      'POST /api/auth/login': () => {
        signedIn = true;
        return { status: 200, body: signedInUser };
      },
      'GET /api/action-items': () => ({ status: 200, body: { items: [], total: 0 } }),
      'GET /api/issues': () => ({ status: 200, body: { items: [], total: 0 } }),
    });
    renderWithProviders(<AppRoutes />, { route: '/login?next=%2F%2Fevil.example.com' });
    await userEvent.type(await screen.findByLabelText('Email'), 'olivia@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  it('sends signed-out users to the sign-in page', async () => {
    mockFetch({ 'GET /api/auth/me': unauthenticated });
    renderWithProviders(<AppRoutes />, { route: '/meetings' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument(),
    );
  });
});
