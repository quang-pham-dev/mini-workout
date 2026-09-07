import { expectNoHorizontalOverflow } from '../../fixtures/responsive';
import { expect, test } from '../../fixtures/test';

test('uses mobile navigation and persists the profile appearance selection', async ({
  activePage,
}) => {
  await activePage.goto('/home');
  await expect
    .poll(() => activePage.evaluate(() => window.innerWidth))
    .toBe(412);
  await expectNoHorizontalOverflow(activePage);
  await expect(
    activePage.getByRole('navigation', { name: 'Main Navigation' }),
  ).toBeHidden();
  await expect(activePage.getByRole('button', { name: 'Theme' })).toBeHidden();

  const openMenu = activePage.getByRole('button', {
    name: 'Open navigation menu',
  });
  await expect(openMenu).toBeVisible();
  await openMenu.tap();
  await expect(openMenu).toHaveAttribute('aria-expanded', 'true');

  const dialog = activePage.getByRole('dialog', { name: 'Mobile Navigation' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close navigation menu' }),
  ).toBeFocused();
  await expect
    .poll(() => activePage.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  await expectNoHorizontalOverflow(activePage);

  const focusable = dialog.locator('a[href], button:not([disabled])');
  const first = focusable.first();
  const last = focusable.last();
  await last.focus();
  await activePage.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await first.focus();
  await activePage.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();

  await activePage.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openMenu).toBeFocused();
  await expect(openMenu).toHaveAttribute('aria-expanded', 'false');
  await expect
    .poll(() => activePage.evaluate(() => document.body.style.overflow))
    .toBe('');

  await openMenu.tap();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Profile', exact: true }).tap();

  await expect(activePage).toHaveURL('/profile');
  await expect(dialog).toBeHidden();
  await expect
    .poll(() => activePage.evaluate(() => document.body.style.overflow))
    .toBe('');
  await expectNoHorizontalOverflow(activePage);
  const appearance = activePage.getByRole('region', { name: 'Appearance' });
  const preference = appearance.getByRole('radiogroup', {
    name: 'Theme preference',
  });
  await expect(preference).toBeVisible();
  await preference.getByRole('radio', { name: /^Dark/ }).tap();
  await expect(preference.getByRole('radio', { name: /^Dark/ })).toBeChecked();
  await expect(activePage.locator('html')).toHaveAttribute(
    'data-theme',
    'dark',
  );
  await expect
    .poll(() =>
      activePage.evaluate(() => localStorage.getItem('mini-workout-theme')),
    )
    .toBe('dark');

  await activePage.reload();
  await expectNoHorizontalOverflow(activePage);
  await expect(activePage.locator('html')).toHaveAttribute(
    'data-theme',
    'dark',
  );
  await expect(
    activePage
      .getByRole('region', { name: 'Appearance' })
      .getByRole('radio', { name: /^Dark/ }),
  ).toBeChecked();
});
