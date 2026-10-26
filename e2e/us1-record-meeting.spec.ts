// Quickstart V1 — record a meeting and its action items (US1).
import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, isoDate, register, unique } from './fixtures';

test('record a meeting, add action items, and comment', async ({ page }) => {
  const email = `${unique('organizer').replace(/\s/g, '')}@example.com`.toLowerCase();
  await register(page, 'New Organizer', email);

  // Step 2: create the meeting.
  await page.getByRole('link', { name: 'New meeting' }).click();
  await expectNoA11yViolations(page);
  const description = unique('Planning');
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Meeting date').fill(isoDate(0));
  await page.getByLabel('Find a registered user').fill('Arjun');
  await page.getByRole('button', { name: /^Add Arjun/ }).click();
  await page.getByLabel('External participant name').fill('Vendor Rep');
  await page.getByRole('button', { name: 'Add external participant' }).click();
  await page.getByRole('button', { name: 'Save meeting' }).click();
  await expect(page.getByRole('heading', { level: 1, name: description })).toBeVisible();

  await page.getByRole('link', { name: 'Meetings', exact: true }).click();
  await expect(page.getByRole('link', { name: description })).toBeVisible();
  await page.getByRole('link', { name: description }).click();

  // Step 3: three action items.
  for (const title of ['Draft agenda', 'Book room', 'Send invites']) {
    await page.getByLabel('Description').fill(title);
    await page.getByLabel('Assignee').selectOption({ label: 'Arjun Assignee' });
    await page.getByLabel('Start date').fill(isoDate(0));
    await page.getByLabel('Due date').fill(isoDate(7));
    await page.getByRole('button', { name: 'Add action item' }).click();
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  }
  await expectNoA11yViolations(page);

  // Step 4: due date before start date is blocked.
  await page.getByLabel('Description').fill('Bad dates');
  await page.getByLabel('Assignee').selectOption({ label: 'Arjun Assignee' });
  await page.getByLabel('Start date').fill(isoDate(5));
  await page.getByLabel('Due date').fill(isoDate(1));
  await page.getByRole('button', { name: 'Add action item' }).click();
  await expect(page.getByText('Due date must be on or after the start date')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bad dates' })).toHaveCount(0);

  // Each item links back to its meeting, and comments show author and time.
  await page.getByRole('link', { name: 'Draft agenda' }).click();
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('link', { name: description })).toBeVisible();
  await page.getByLabel('Add a comment').fill('Agenda draft is in the shared folder.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  const comment = page.getByRole('list', { name: 'Comments' }).getByRole('listitem').first();
  await expect(comment).toContainText('New Organizer');
  await expect(comment).toContainText('Agenda draft is in the shared folder.');
  await expect(comment.locator('time')).toBeVisible();
  await expectNoA11yViolations(page);
});
