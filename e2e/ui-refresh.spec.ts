// Feature 002 — Tailwind UI refresh: success toasts (US2), the mobile menu, touch targets and
// narrow-screen tables (US3), and reduced motion. See specs/002-tailwind-ui-refresh/quickstart.md.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, isoDate, signIn, unique, users } from './fixtures';

async function createMeeting(page: Page): Promise<string> {
  const description = unique('Refresh check');
  await page.goto('/meetings/new');
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Meeting date').fill(isoDate(0));
  await page.getByLabel('External participant name').fill('Vendor Rep');
  await page.getByRole('button', { name: 'Add external participant' }).click();
  await page.getByRole('button', { name: 'Save meeting' }).click();
  await expect(page.getByRole('heading', { level: 1, name: description })).toBeVisible();
  return description;
}

/** FR-017: controls are at least 44px tall; checkboxes count through their label. */
async function expectTouchTargets(page: Page): Promise<void> {
  const small = await page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const selector = [
      'button',
      'a.btn',
      'header a',
      'nav a',
      'select',
      'textarea',
      'input:not([type=checkbox]):not([type=radio]):not([type=hidden])',
      'label:has(> input[type=checkbox])',
    ].join(',');
    return Array.from(document.querySelectorAll(selector))
      .filter((el) => visible(el) && !el.closest('.sr-only, [data-toast]'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const iconOnly = el.tagName === 'BUTTON' && el.querySelector('.sr-only') !== null;
        return r.height < 43.5 || (iconOnly && r.width < 43.5);
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
  });
  expect(small, small.join('\n')).toEqual([]);
}

test('success toasts confirm create actions and then go away', async ({ page }) => {
  await signIn(page, users.olivia);
  await createMeeting(page);
  const toast = page.getByText('Meeting created');
  await expect(toast).toBeVisible();
  // Hovering a toast pauses its timer by design; keep the pointer clear of it.
  await page.mouse.move(0, 0);
  await expect(toast).toBeHidden({ timeout: 6000 });

  await page.getByLabel('Description').fill('Check the toast');
  await page.getByLabel('Assignee').selectOption({ index: 1 });
  await page.getByLabel('Start date').fill(isoDate(0));
  await page.getByLabel('Due date').fill(isoDate(3));
  await page.getByRole('button', { name: 'Add action item' }).click();
  await expect(page.getByText('Action item added')).toBeVisible();
});

test.describe('phones and narrow screens', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? Infinity) >= 768,
    'runs in the mobile-320 / mobile-360 projects',
  );

  test('the menu replaces the inline navigation and is keyboard operable', async ({ page }) => {
    await signIn(page, users.olivia);
    const menu = page.getByRole('button', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Action items' }).click();
    await expect(page).toHaveURL(/\/action-items$/);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  });

  test('core flows fit the screen with large enough touch targets', async ({ page }) => {
    await signIn(page, users.olivia);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    const description = await createMeeting(page);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    await page.getByLabel('Description').fill('Mobile item');
    await page.getByLabel('Assignee').selectOption({ index: 1 });
    await page.getByLabel('Start date').fill(isoDate(0));
    await page.getByLabel('Due date').fill(isoDate(3));
    await page.getByRole('button', { name: 'Add action item' }).click();
    await page.getByRole('link', { name: 'Mobile item' }).click();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(description);
    await page.getByLabel('Status').selectOption({ label: 'In Progress' });
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    await page.goto('/action-items');
    await expect(page.getByRole('heading', { level: 1, name: 'Action items' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    // US3 scenario 3: the key columns stay visible on a narrow screen.
    for (const column of ['Action item', 'Status', 'Assignee', 'Due']) {
      await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
    }
  });
});

test('reduced motion turns off the skeleton pulse', async ({ page }) => {
  await signIn(page, users.olivia);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/action-items?**', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/action-items');
  const bar = page.locator('[data-skeleton]').first();
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
