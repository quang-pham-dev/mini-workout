import { expect, test } from '../../fixtures/test';

test('keeps the Theme menu in the authenticated header and supports keyboard selection', async ({
  activePage,
}) => {
  await activePage.goto('/home');
  const trigger = activePage.getByRole('button', { name: 'Theme' });
  await expect(trigger).toHaveCount(1);
  await trigger.press('Enter');
  await expect(activePage.getByRole('menu')).toBeVisible();
  await activePage.keyboard.press('ArrowDown');
  await expect(
    activePage.getByRole('menuitemradio', { name: 'Dark' }),
  ).toBeFocused();
  await activePage.keyboard.press('Enter');
  await expect(activePage.locator('html')).toHaveClass(/dark/);
  await expect(activePage.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
});
