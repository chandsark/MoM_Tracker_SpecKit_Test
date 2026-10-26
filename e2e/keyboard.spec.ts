// Quickstart V7 step 3 — complete V1 with the keyboard only, with a visible focus indicator on
// every control that receives focus (WCAG 2.1.1, 2.4.7).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PASSWORD, isoDate, unique, users } from './fixtures';

/** Presses Tab until `target` has focus, asserting each focused element shows a focus outline. */
async function tabTo(page: Page, target: Locator, maxPresses = 80): Promise<void> {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return {
        label: `${el.tagName}#${el.id} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? ''} on ${location.pathname}`,
        visible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
      };
    });
    if (focus) expect(focus.visible, `no visible focus indicator on ${focus.label}`).toBe(true);
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${target.toString()} with Tab`);
}

/**
 * Types a YYYY-MM-DD date into the focused Chromium date input. The segment order follows the
 * host OS's regional settings (not the browser locale), so each order is tried in turn and the
 * segments are cleared with Backspace / Shift+Tab between attempts.
 */
async function typeDate(page: Page, iso: string): Promise<void> {
  const [y, m, d] = iso.split('-') as [string, string, string];
  const value = () => page.evaluate(() => (document.activeElement as HTMLInputElement).value);
  for (const order of [`${m}${d}${y}`, `${d}${m}${y}`, `${y}${m}${d}`]) {
    await page.keyboard.type(order);
    if ((await value()) === iso) return;
    for (const key of ['Backspace', 'Shift+Tab', 'Backspace', 'Shift+Tab', 'Backspace']) {
      await page.keyboard.press(key);
    }
  }
  throw new Error(`Could not type ${iso} into the date input`);
}

test('records a meeting with action items and a comment using only the keyboard', async ({
  page,
}) => {
  // Sign in.
  await page.context().clearCookies();
  await page.goto('/login');
  await tabTo(page, page.getByLabel('Email'));
  await page.keyboard.type(users.olivia);
  await tabTo(page, page.getByLabel('Password'));
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible();

  // New meeting (one interaction from Home).
  await tabTo(page, page.getByRole('main').getByRole('link', { name: 'New meeting' }));
  await page.keyboard.press('Enter');
  const title = unique('Keyboard sync');
  await tabTo(page, page.getByLabel('Description'));
  await page.keyboard.type(title);
  await tabTo(page, page.getByLabel('Meeting date'));
  await typeDate(page, isoDate(0));
  await tabTo(page, page.getByLabel('Find a registered user'));
  await page.keyboard.type('Arjun');
  const addArjun = page.getByRole('button', { name: /^Add Arjun/ });
  await expect(addArjun).toBeVisible();
  await tabTo(page, addArjun);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Selected participants' })).toContainText('Arjun');
  await tabTo(page, page.getByRole('button', { name: 'Save meeting' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  // Add an action item.
  await tabTo(page, page.getByLabel('Description'));
  await page.keyboard.type('Prepare the keyboard report');
  await tabTo(page, page.getByLabel('Assignee'));
  await page.keyboard.type('Arjun');
  await expect(page.getByLabel('Assignee')).not.toHaveValue('');
  await tabTo(page, page.getByLabel('Start date'));
  await typeDate(page, isoDate(0));
  await tabTo(page, page.getByLabel('Due date'));
  await typeDate(page, isoDate(7));
  await tabTo(page, page.getByRole('button', { name: 'Add action item' }));
  await page.keyboard.press('Enter');
  const itemLink = page.getByRole('link', { name: 'Prepare the keyboard report' });
  await expect(itemLink).toBeVisible();

  // Open it and comment (the tree is above the form, so Tab wraps round through the page).
  await tabTo(page, itemLink);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Prepare the keyboard report' }),
  ).toBeVisible();
  await tabTo(page, page.getByLabel('Add a comment'));
  await page.keyboard.type('Posted without a mouse.');
  await tabTo(page, page.getByRole('button', { name: 'Post comment' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Comments' })).toContainText(
    'Posted without a mouse.',
  );
});
