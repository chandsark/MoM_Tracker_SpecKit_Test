// Quickstart V6 — soft delete and restore (FR-025, FR-028), steps 1–3.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { expectNoA11yViolations, isoDate, signIn, unique, users } from './fixtures';

const CSRF = { 'X-Requested-With': 'fetch' };

/** Sets up a meeting with two action items and one issue through the API (as the signed-in user). */
async function createMeetingWithWork(request: APIRequestContext, title: string) {
  const arjun = (await (await request.get('/api/users?q=arjun')).json()).items[0] as { id: string };
  const meeting = await (
    await request.post('/api/meetings', {
      headers: CSRF,
      data: { description: title, meetingDate: isoDate(0), participants: [{ userId: arjun.id }] },
    })
  ).json();
  const item = (description: string) =>
    request.post(`/api/meetings/${meeting.id}/action-items`, {
      headers: CSRF,
      data: { description, assigneeId: arjun.id, startDate: isoDate(0), dueDate: isoDate(7) },
    });
  const first = await (await item(`${title} – item one`)).json();
  await item(`${title} – item two`);
  await request.post(`/api/action-items/${first.id}/issues`, {
    headers: CSRF,
    data: { title: `${title} – issue`, description: 'Something is wrong', severity: 'MEDIUM' },
  });
  return { meetingId: meeting.id as string, firstItemId: first.id as string };
}

test('organizer deletes a meeting with its work, then restores it; others cannot delete', async ({
  page,
}) => {
  await signIn(page, users.olivia);
  const title = unique('Retired project');
  const { meetingId, firstItemId } = await createMeetingWithWork(page.request, title);

  // Step 1: the confirmation lists what will be deleted.
  await page.goto(`/meetings/${meetingId}`);
  await page.getByRole('button', { name: 'Delete meeting' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this meeting?' });
  await expect(dialog).toContainText('2 action items and 1 issue');
  await expect(dialog.getByRole('list', { name: `Issues on ${title} – item one` })).toHaveText(
    `${title} – issue`,
  );
  await expect(dialog).toContainText(`${title} – item two`);
  await expectNoA11yViolations(page);
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/meetings$/);

  // Nothing from the meeting appears in lists, filters, traceability, or exports.
  await page.goto(`/meetings?q=${encodeURIComponent(title)}`);
  await expect(page.getByText('No meetings match these filters.')).toBeVisible();
  await page.goto(`/action-items?q=${encodeURIComponent(title)}`);
  await expect(page.getByText('No action items match these filters.')).toBeVisible();
  await page.goto('/issues');
  await expect(page.getByRole('link', { name: `${title} – issue` })).toHaveCount(0);
  expect((await page.request.get(`/api/meetings/${meetingId}/traceability`)).status()).toBe(404);
  expect(await (await page.request.get('/api/action-items/export.csv')).text()).not.toContain(
    title,
  );
  expect(await (await page.request.get('/api/issues/export.csv')).text()).not.toContain(title);

  // Step 2: restore from Deleted items; everything comes back and history shows both events.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Deleted items' })
    .click();
  const entry = page.getByRole('listitem').filter({ hasText: title });
  await expect(entry).toContainText('Meeting');
  await expect(entry).toContainText('3 related records');
  await expectNoA11yViolations(page);
  await entry.getByRole('button', { name: /Restore/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);

  await page.goto(`/meetings/${meetingId}`);
  const tree = page.getByRole('list', { name: 'Traceability' });
  await expect(tree.getByRole('link', { name: `${title} – item one` })).toBeVisible();
  await expect(tree.getByRole('link', { name: `${title} – issue` })).toBeVisible();
  const history = page.getByRole('list', { name: 'Change history' });
  await expect(history).toContainText('Olivia Organizer deleted this record');
  await expect(history).toContainText('Olivia Organizer restored this record');

  await page.goto(`/action-items/${firstItemId}`);
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('list', { name: 'Change history' })).toContainText(
    'restored this record',
  );

  // Step 3: a non-organizer sees no delete control and the API refuses.
  await signIn(page, users.arjun);
  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete meeting' })).toHaveCount(0);
  const res = await page.request.delete(`/api/meetings/${meetingId}?version=1`, { headers: CSRF });
  expect(res.status()).toBe(403);
});
