import type { Locator, Page } from '@playwright/test';

/**
 * Returns the application form error, excluding Next.js' route announcer,
 * which also uses role="alert" for accessibility.
 */
export function getFormAlert(scope: Page | Locator): Locator {
  return scope.locator('p[role="alert"]');
}
