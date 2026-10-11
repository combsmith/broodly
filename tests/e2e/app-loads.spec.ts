import { test, expect } from '@playwright/test';

test.describe('App Smoke Tests', () => {
  test('web app loads without crash', async ({ page }) => {
    await page.goto('/');
    // App should render without the import.meta SyntaxError
    await expect(page.locator('body')).not.toHaveText(/SyntaxError/);
    await expect(page.locator('body')).not.toHaveText(/Cannot use/);
  });

  test('app renders onboarding or auth screen for unauthenticated user', async ({ page }) => {
    await page.goto('/');
    // Unauthenticated users should see onboarding welcome or sign-in
    const content = page.locator('body');
    await expect(content).toBeVisible();
    // Should contain either onboarding or auth related text
    const text = await content.textContent();
    expect(
      text?.includes('Welcome') ||
      text?.includes('Sign in') ||
      text?.includes('Create') ||
      text?.includes('Broodly'),
    ).toBeTruthy();
  });

  test('no JavaScript console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-blocking warnings
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('auth/invalid-api-key') && // Expected when no Firebase config
        !e.includes('Failed to fetch'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
