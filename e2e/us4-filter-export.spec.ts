// Quickstart V4 — filtering and CSV export (US4), steps 2–5, against the demo seed data.
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn, users } from './fixtures';

const ITEM_HEADERS =
  'Action Item ID,Description,Assignee,Start Date,Due Date,Status,Overdue,Open Issues,Meeting ID,Meeting Date,Meeting Description,Last Updated';

async function resultTotal(page: Page): Promise<number> {
  const text = await page.getByTestId('result-count').textContent();
  return Number(/(\d+)/.exec(text ?? '')?.[1]);
}

test.beforeEach(async ({ page }) => {
  await signIn(page, users.olivia);
});

test('filters action items, exports the same rows as CSV, and clears filters', async ({ page }) => {
  // Step 2: assignee + status + overdue.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Action items' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Action items' })).toBeVisible();
  await page.getByLabel('Assignee').selectOption({ label: 'Arjun Assignee' });
  await page.getByRole('group', { name: 'Status' }).getByLabel('In Progress').check();
  await page.getByLabel('Overdue only').check();
  await expect(page).toHaveURL(/assigneeId=.+/);
  await expect(page).toHaveURL(/status=IN_PROGRESS/);
  await expect(page).toHaveURL(/overdue=true/);

  const table = page.getByRole('table');
  await expect(table.getByRole('link', { name: 'Draft the Q4 roadmap' })).toBeVisible();
  const rows = table.locator('tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(rows.nth(i)).toContainText('Overdue');
    await expect(rows.nth(i)).toContainText('Arjun Assignee');
    await expect(rows.nth(i)).toContainText('In Progress');
  }
  expect(await resultTotal(page)).toBe(count);
  await expectNoA11yViolations(page);

  // Step 3: Export CSV matches what is on screen.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^action-items-\d{8}\.csv$/);
  const raw = await readFile((await download.path())!, 'utf8');
  const csv = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip the UTF-8 BOM
  const lines = csv.split('\r\n').filter(Boolean);
  expect(lines[0]).toBe(ITEM_HEADERS);
  expect(lines).toHaveLength(count + 1);
  expect(lines.slice(1).join('\n')).toContain('Draft the Q4 roadmap');
  expect(lines[1]).toContain('Q4 planning kickoff'); // meeting columns are filled in

  // Step 4: a filter with no matches shows the empty state; Clear filters resets everything.
  await page.getByLabel('Keyword').fill('no such action item zzz');
  await expect(page.getByText('No action items match these filters.')).toBeVisible();
  await page.locator('.empty-state').getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/action-items$/);
  await expect(
    page.getByRole('table').getByRole('link', { name: 'Collect budget estimates' }),
  ).toBeVisible();
});

test('filters meetings by date range, participant, and keyword', async ({ page }) => {
  await page.goto('/meetings');
  await page.getByLabel('Keyword').fill('Q4 planning');
  const table = page.getByRole('table');
  await expect(table.getByRole('link', { name: 'Q4 planning kickoff' })).toBeVisible();
  await expect(table.getByRole('link', { name: 'Weekly delivery review' })).toHaveCount(0);

  await page.getByLabel('Participant').selectOption({ label: 'Sam Outsider' });
  await expect(page.getByText('No meetings match these filters.')).toBeVisible();
  await page.getByLabel('Participant').selectOption({ label: 'Mei Participant' });
  await expect(table.getByRole('link', { name: 'Q4 planning kickoff' })).toBeVisible();

  await page.getByLabel('From').fill('2000-01-01');
  await page.getByLabel('To').fill('2000-12-31');
  await expect(page.getByText('No meetings match these filters.')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('filters issues by status and severity and exports them', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('group', { name: 'Severity' }).getByLabel('High').check();
  await page.getByRole('group', { name: 'Status' }).getByLabel('Open').check();
  await expect(page).toHaveURL(/severity=HIGH/);
  const table = page.getByRole('table');
  await expect(table.getByRole('link', { name: 'Waiting on QA sign-off' })).toBeVisible();
  const rows = table.locator('tbody tr');
  for (let i = 0; i < (await rows.count()); i += 1) {
    await expect(rows.nth(i)).toContainText('High');
    await expect(rows.nth(i)).toContainText('Open');
  }
  await expectNoA11yViolations(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^issues-\d{8}\.csv$/);
  const lines = (await readFile((await download.path())!, 'utf8')).split('\r\n').filter(Boolean);
  expect(lines).toHaveLength((await rows.count()) + 1);

  await page.getByRole('group', { name: 'Severity' }).getByLabel('Critical').check();
  await page.getByRole('group', { name: 'Severity' }).getByLabel('High').uncheck();
  await page.getByRole('group', { name: 'Status' }).getByLabel('Resolved').check();
  await page.getByRole('group', { name: 'Status' }).getByLabel('Open').uncheck();
  await expect(page.getByText('No issues match these filters.')).toBeVisible();
});
