import { test, expect } from '@playwright/test';

// These routes are called during app boot and login page render.
// We stub them so the UI can load without a real backend in CI.
test.describe('login route (mocked backend)', () => {
  test('renders login UI elements', async ({ page, context }) => {
    // Make sure locale and theme are deterministic
    await context.addCookies([
      { name: 'i18next', value: 'en', url: 'http://localhost:5173' },
    ]);

    // Mock KubeStellar status check to keep user on /login
    await page.route('**/api/kubestellar/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allReady: true }),
      });
    });

    // Mock auth/me to appear logged out
    await page.route('**/api/me', async route => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    // Mock login endpoint to succeed (not used in this test, but handy for future)
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'fake',
          refreshToken: 'fake',
          username: 'tester',
        }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Heading text is translated; assert by text keys rendered
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });
});