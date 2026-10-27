import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/Toast';

export interface MockRequest {
  url: URL;
  body: unknown;
}
export type MockHandler = (req: MockRequest) => { status: number; body?: unknown };

/**
 * Replaces fetch with a router keyed by "METHOD /path". Unmatched requests get a 404 so a test
 * fails loudly instead of hanging.
 */
export function mockFetch(routes: Record<string, MockHandler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const key = `${method} ${url.pathname}`;
    const handler = routes[key];
    const result = handler
      ? handler({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      : { status: 404, body: { error: { code: 'NOT_FOUND', message: `No mock for ${key}` } } };
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const signedInUser = { id: 'u-me', name: 'Olivia', email: 'olivia@example.com' };

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
