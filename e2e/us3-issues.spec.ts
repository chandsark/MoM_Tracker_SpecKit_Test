// Quickstart V3 — issues and the Blocked status (US3).
import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, isoDate, signIn, unique, users } from './fixtures';

test('participant raises an issue; assignee blocks, resolves, and confirms Done', async ({
  page,
}) => {
  // Organizer sets up a meeting with Arjun (assignee) and Mei (participant).
  await signIn(page, users.olivia);
  await page.goto('/meetings/new');
  const meetingTitle = unique('Issue review');
  await page.getByLabel('Description').fill(meetingTitle);
  await page.getByLabel('Meeting date').fill(isoDate(0));
  for (const name of ['Arjun', 'Mei']) {
    await page.getByLabel('Find a registered user').fill(name);
    await page.getByRole('button', { name: new RegExp(`^Add ${name}`) }).click();
  }
  await page.getByRole('button', { name: 'Save meeting' }).click();
  await expect(page.getByRole('heading', { level: 1, name: meetingTitle })).toBeVisible();
  const itemTitle = unique('Ship release');
  await page.getByLabel('Description').fill(itemTitle);
  await page.getByLabel('Assignee').selectOption({ label: 'Arjun Assignee' });
  await page.getByLabel('Start date').fill(isoDate(0));
  await page.getByLabel('Due date').fill(isoDate(10));
  await page.getByRole('button', { name: 'Add action item' }).click();
  await page.getByRole('link', { name: itemTitle }).click();
  const itemUrl = page.url();

  // Step 1: Mei (participant) raises a High issue.
  await signIn(page, users.mei);
  await page.goto(itemUrl);
  await page.getByText('Raise an issue', { exact: true }).click();
  await page.getByLabel('Title').fill('QA environment down');
  await page
    .getByLabel('Description', { exact: true })
    .last()
    .fill('Cannot run the regression suite.');
  await page.getByLabel('Severity').selectOption('HIGH');
  await page.getByRole('button', { name: 'Raise issue' }).click();
  const issues = page.getByRole('list', { name: 'Issues' });
  await expect(issues).toContainText('QA environment down');
  await expect(issues).toContainText('Open');
  await expect(page.getByText('1 open issue')).toBeVisible();
  await expectNoA11yViolations(page);

  // Step 2: Arjun sets Blocked.
  await signIn(page, users.arjun);
  await page.goto(itemUrl);
  await page.getByLabel('Status').selectOption('BLOCKED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.goto('/');
  const mine = page.getByRole('list', { name: 'My open action items' });
  await expect(mine.getByRole('listitem').filter({ hasText: itemTitle })).toContainText('Blocked');

  // Step 3: Arjun resolves the issue; the item stays Blocked.
  await page.goto(itemUrl);
  await page.getByRole('link', { name: 'QA environment down' }).click();
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('link', { name: meetingTitle })).toBeVisible();
  await page.getByLabel('Status').selectOption('RESOLVED');
  await page.getByRole('button', { name: 'Save issue' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await expectNoA11yViolations(page);
  await breadcrumb.getByRole('link', { name: itemTitle }).click();
  await expect(page.getByLabel('Status')).toHaveValue('BLOCKED');

  // Step 4: a new open issue makes Done ask for confirmation.
  await page.getByText('Raise an issue', { exact: true }).click();
  await page.getByLabel('Title').fill('Docs missing');
  await page.getByLabel('Description', { exact: true }).last().fill('Release notes not written.');
  await page.getByLabel('Severity').selectOption('LOW');
  await page.getByRole('button', { name: 'Raise issue' }).click();
  await expect(page.getByText('1 open issue')).toBeVisible();
  await page.getByLabel('Status').selectOption('DONE');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mark as Done with open issues?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Mark as Done' }).click();
  await expect(page.getByLabel('Status')).toHaveValue('DONE');
});
