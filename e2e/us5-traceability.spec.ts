// Quickstart V5 — end-to-end traceability (US5), against the demo seed data.
import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn, users } from './fixtures';

test('navigates issue → action item → meeting and shows the full tree', async ({ page }) => {
  await signIn(page, users.mei);

  // Step 1: open an issue; each breadcrumb link opens its parent in one click (SC-003).
  await page.goto('/issues');
  await page.getByRole('link', { name: 'Waiting on QA sign-off' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Waiting on QA sign-off' }),
  ).toBeVisible();
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('listitem')).toHaveText([
    'Weekly delivery review',
    'Fix the release checklist',
    'Waiting on QA sign-off',
  ]);
  await expectNoA11yViolations(page);

  await breadcrumb.getByRole('link', { name: 'Fix the release checklist' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fix the release checklist' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Weekly delivery review' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Weekly delivery review' }),
  ).toBeVisible();

  // Step 2: the meeting shows summary counts and every action item with its issues on one screen.
  const summary = page.getByRole('list', { name: 'Summary' });
  await expect(summary).toContainText('Blocked: 1');
  await expect(summary).toContainText('Done: 1');
  await expect(summary).toContainText('Overdue: 0');
  await expect(summary).toContainText(/Open issues: \d+/);

  const tree = page.getByRole('list', { name: 'Traceability' });
  await expect(tree.getByRole('link', { name: 'Fix the release checklist' })).toBeVisible();
  await expect(tree.getByRole('link', { name: 'Share demo recording' })).toBeVisible();
  const issues = tree.getByRole('list', { name: 'Issues for Fix the release checklist' });
  await expect(issues.getByRole('link', { name: 'Waiting on QA sign-off' })).toBeVisible();

  // Collapse and re-expand with the keyboard.
  const toggle = tree.getByRole('button', { name: /Fix the release checklist/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(issues).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(issues.getByRole('link', { name: 'Waiting on QA sign-off' })).toBeVisible();
  await expectNoA11yViolations(page);

  // From the tree, an issue is one click away.
  await issues.getByRole('link', { name: 'Waiting on QA sign-off' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Waiting on QA sign-off' }),
  ).toBeVisible();
});
