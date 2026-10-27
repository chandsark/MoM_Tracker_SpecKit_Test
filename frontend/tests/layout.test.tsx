// FR-004: the active section is highlighted and announced as current (regression guard — NavLink
// already provides aria-current, so this test passes before and after the refresh).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/routes';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

function signedIn() {
  mockFetch({
    'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
    'GET /api/users': () => ({ status: 200, body: { items: [], total: 0 } }),
    'GET /api/meetings': () => ({ status: 200, body: { items: [], total: 0 } }),
    'GET /api/action-items': () => ({ status: 200, body: { items: [], total: 0 } }),
    'GET /api/issues': () => ({ status: 200, body: { items: [], total: 0 } }),
  });
}

describe('Layout navigation', () => {
  it('marks the current section with aria-current="page"', async () => {
    signedIn();
    renderWithProviders(<AppRoutes />, { route: '/meetings' });
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Meetings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'My work' })).not.toHaveAttribute('aria-current');
  });
});

// FR-005 / data-model "Mobile navigation menu". jsdom ignores CSS, so the disclosure is tested
// by its ARIA state; Playwright covers which variant is visible at each width.
describe('Mobile navigation menu', () => {
  async function openMenu() {
    signedIn();
    renderWithProviders(<AppRoutes />, { route: '/' });
    const button = await screen.findByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const panelId = button.getAttribute('aria-controls')!;
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId)).toBeNull();
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(panelId)!;
    expect(panel).not.toBeNull();
    return { button, panelId, panel };
  }

  it('opens and closes with the Menu button', async () => {
    const { button, panelId } = await openMenu();
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(panelId)).toBeNull();
  });

  it('closes on Escape and returns focus to the Menu button', async () => {
    const { button, panel } = await openMenu();
    within(panel).getByRole('link', { name: 'Issues' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes after choosing a destination', async () => {
    const { button, panelId, panel } = await openMenu();
    await userEvent.click(within(panel).getByRole('link', { name: 'Meetings' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Meetings' })).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(panelId)).toBeNull();
  });

  it('offers Sign out inside the menu', async () => {
    const { panel } = await openMenu();
    expect(within(panel).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
