import { test, expect } from '@playwright/test';

test('login page loads and shows key elements', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in to kubestellar/i })).toBeVisible();
  await expect(page.getByPlaceholder('Username')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByText(/Access Your Dashboard/i)).toBeVisible();

});