// Quickstart V7 steps 1–2 — axe on every route in contracts/ui-routes.md, and no horizontal
// scrolling. Runs in the desktop project and in the 360 px "mobile-360" project.
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn, users } from './fixtures';

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, viewport } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(
    scrollWidth,
    `page is ${scrollWidth}px wide in a ${viewport}px viewport`,
  ).toBeLessThanOrEqual(viewport);
}

async function check(page: Page, path: string, heading: string | RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0);
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page);
}

test('signed-out routes', async ({ page }) => {
  await page.context().clearCookies();
  await check(page, '/login', 'Sign in');
  await check(page, '/register', 'Create account');
});

test('signed-in routes as the organizer', async ({ page }) => {
  await signIn(page, users.olivia);
  const api = async <T>(url: string): Promise<T> =>
    (await (await page.request.get(url)).json()) as T;
  type Page_<T> = { items: T[] };
  const meeting = (await api<Page_<{ id: string }>>('/api/meetings?q=Weekly%20delivery%20review'))
    .items[0]!;
  const item = (
    await api<Page_<{ id: string }>>('/api/action-items?q=Fix%20the%20release%20checklist')
  ).items[0]!;
  const issue = (
    await api<Page_<{ id: string; title: string }>>('/api/issues?severity=HIGH')
  ).items.find((i) => i.title === 'Waiting on QA sign-off')!;

  await check(page, '/', 'My work');
  await check(page, '/meetings', 'Meetings');
  await check(page, '/meetings/new', 'New meeting');
  await check(page, `/meetings/${meeting.id}`, 'Weekly delivery review');
  await check(page, `/meetings/${meeting.id}/edit`, /Edit meeting/);
  await check(page, '/action-items', 'Action items');
  await check(page, '/action-items?status=OPEN,IN_PROGRESS&overdue=true', 'Action items');
  await check(page, `/action-items/${item.id}`, 'Fix the release checklist');
  await check(page, '/issues', 'Issues');
  await check(page, `/issues/${issue.id}`, 'Waiting on QA sign-off');
  await check(page, '/deleted', 'Deleted items');
});
