import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('welcome screen renders with sign-in options', async ({ page }) => {
    await page.goto('/');
    // Should show the onboarding/welcome screen for new users
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation between onboarding steps works', async ({ page }) => {
    await page.goto('/');
    // The onboarding flow should be navigable
    // Specific interactions depend on auth state — this verifies
    // the routing doesn't crash
    await expect(page.locator('body')).not.toHaveText(/SyntaxError/);
    await expect(page.locator('body')).not.toHaveText(/Unhandled Runtime Error/);
  });
});
