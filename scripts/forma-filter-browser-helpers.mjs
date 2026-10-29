import { expect } from '@playwright/test';

/** Interact with the shared collection UI, retaining the existing workflow oracle. */
export async function setCollectionFilter(page, collection, group, values) {
  const trigger = page.getByRole('button', { name: 'Filters', exact: true });
  const dialog = page.getByRole('complementary', { name: `Filter ${collection}`, exact: true });
  if (!(await dialog.isVisible())) await trigger.click();
  await expect(dialog).toBeVisible();
  const options = dialog.getByRole('group', { name: group, exact: true });
  for (const checkbox of await options.getByRole('checkbox').all()) await checkbox.uncheck();
  for (const value of values)
    await options.getByRole('checkbox', { name: value, exact: true }).check();
  await dialog.getByRole('button', { name: 'Close filter panel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
}
