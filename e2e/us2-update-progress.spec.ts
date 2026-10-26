// Quickstart V2 — assignee updates progress (US2).
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, isoDate, signIn, unique, users } from './fixtures';

async function createMeetingWithItem(page: Page, itemTitle: string): Promise<string> {
  await signIn(page, users.olivia);
  await page.goto('/meetings/new');
  const meetingTitle = unique('Progress sync');
  await page.getByLabel('Description').fill(meetingTitle);
  await page.getByLabel('Meeting date').fill(isoDate(0));
  await page.getByLabel('Find a registered user').fill('Arjun');
  await page.getByRole('button', { name: /^Add Arjun/ }).click();
  await page.getByLabel('Find a registered user').fill('Mei');
  await page.getByRole('button', { name: /^Add Mei/ }).click();
  await page.getByRole('button', { name: 'Save meeting' }).click();
  await expect(page.getByRole('heading', { level: 1, name: meetingTitle })).toBeVisible();
  await page.getByLabel('Description').fill(itemTitle);
  await page.getByLabel('Assignee').selectOption({ label: 'Arjun Assignee' });
  await page.getByLabel('Start date').fill(isoDate(0));
  await page.getByLabel('Due date').fill(isoDate(10));
  await page.getByRole('button', { name: 'Add action item' }).click();
  await page.getByRole('link', { name: itemTitle }).click();
  return page.url();
}

test('assignee updates status and due date; history records both', async ({ page }) => {
  const title = unique('Update roadmap');
  const itemUrl = await createMeetingWithItem(page, title);

  await signIn(page, users.arjun);
  await page.getByRole('link', { name: title }).click(); // from My work
  await page.getByLabel('Status').selectOption('IN_PROGRESS');
  await page.getByLabel('Due date').fill(isoDate(14));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

  await page.getByRole('tab', { name: 'History' }).click();
  const history = page.getByRole('list', { name: 'Change history' });
  await expect(history).toContainText('Arjun Assignee changed status from Open to In Progress');
  await expect(history).toContainText('Arjun Assignee changed due date');
  await expectNoA11yViolations(page);

  // Non-participant: read only, and the API refuses changes.
  await signIn(page, users.sam);
  await page.goto(itemUrl);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByLabel('Status')).toHaveCount(0);
  await expect(page.getByLabel('Add a comment')).toHaveCount(0);
  const id = itemUrl.split('/').pop()!;
  const forbidden = await page.request.patch(`/api/action-items/${id}`, {
    data: { version: 2, status: 'DONE' },
    headers: { 'X-Requested-With': 'fetch' },
  });
  expect(forbidden.status()).toBe(403);

  // Participant: may comment, may not change status.
  await signIn(page, users.mei);
  await page.goto(itemUrl);
  await expect(page.getByLabel('Status')).toHaveCount(0);
  await page.getByLabel('Add a comment').fill('I can help with the data.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByRole('list', { name: 'Comments' })).toContainText(
    'I can help with the data.',
  );
});

test('a stale edit in a second tab shows the conflict message', async ({ page, context }) => {
  const title = unique('Conflict item');
  const itemUrl = await createMeetingWithItem(page, title);
  await signIn(page, users.arjun);
  await page.goto(itemUrl);
  const tab2 = await context.newPage();
  await tab2.goto(itemUrl);

  await page.getByLabel('Status').selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

  await tab2.getByLabel('Status').selectOption('DONE');
  await tab2.getByRole('button', { name: 'Save changes' }).click();
  const alert = tab2.getByRole('alert');
  await expect(alert).toContainText('This item was changed by someone else');
  await expect(alert).toContainText('In Progress');
});
