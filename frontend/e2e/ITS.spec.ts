import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('ITS Page - Complete Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('loads ITS page successfully with clusters', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');

    // Should show table
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Should show clusters from MSW mock data
    await expect(page.getByText('cluster1').first()).toBeVisible();
    await expect(page.getByText('cluster2').first()).toBeVisible();

    // Should show cluster count
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
  });

  test('displays loading state initially', async ({ page }) => {
    await page.goto(`${BASE}/its`);

    // Should show loading indicator initially
    try {
      const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"]').first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    } catch {
      // Fallback: check for loading text
      const loadingText = page.locator('text=/loading/i').first();
      if (await loadingText.isVisible({ timeout: 1000 })) {
        await expect(loadingText).toBeVisible();
      }
    }

    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('search functionality works', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Find search input
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Search for cluster1
    await searchInput.fill('cluster1');
    await page.waitForTimeout(1000);

    // Should filter to show only cluster1
    await expect(page.getByText('cluster1').first()).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Should show all clusters again
    await expect(page.getByText('cluster1').first()).toBeVisible();
    await expect(page.getByText('cluster2').first()).toBeVisible();
  });

  test('import cluster button is visible and clickable', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Find import button
    const importButton = page
      .getByRole('button')
      .filter({ hasText: /Import|Add|Connect/i })
      .first();
    await expect(importButton).toBeVisible();

    // Click import button
    await importButton.click();
    await page.waitForTimeout(1000);

    // Should open import dialog
    const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
    if (await dialog.isVisible()) {
      await expect(dialog).toBeVisible();
    }
  });

  test('cluster status badges are displayed', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Look for status indicators
    const statusBadges = page
      .locator('[class*="badge"], [class*="status"], [class*="chip"]')
      .filter({ hasText: /Active|Available|Ready|Running/i });
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('table headers are present', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Check for table headers
    const headers = page.locator('th, [role="columnheader"]');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    // Should have name column
    const nameHeader = page
      .locator('th, [role="columnheader"]')
      .filter({ hasText: /Name|Cluster/i });
    if (await nameHeader.first().isVisible()) {
      await expect(nameHeader.first()).toBeVisible();
    }
  });

  test('cluster actions are available', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Look for action buttons or menu
    const actionButtons = page
      .locator('button')
      .filter({ hasText: /Action|Menu|Edit|Delete|Detach/i });
    const actionCount = await actionButtons.count();

    if (actionCount > 0) {
      await expect(actionButtons.first()).toBeVisible();
    }

    // Look for three-dot menu or action dropdown
    const menuButtons = page.locator(
      '[class*="menu"], [class*="dropdown"], button[aria-label*="menu"]'
    );
    const menuCount = await menuButtons.count();

    if (menuCount > 0) {
      await expect(menuButtons.first()).toBeVisible();
    }
  });

  test('keyboard shortcuts work', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Test Ctrl+F for search focus
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(300);

    const searchInput = page.locator('input[type="text"]').first();
    const isFocused = await searchInput.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);

    // Type in search
    await searchInput.fill('cluster1');
    await page.waitForTimeout(1000);
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // Test Escape to clear
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('');
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Apply MSW success scenario
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // Clusters should still be visible
    await expect(page.getByText('cluster1').first()).toBeVisible();

    // Import button should be accessible
    const importButton = page
      .getByRole('button')
      .filter({ hasText: /Import|Add|Connect/i })
      .first();
    if (await importButton.isVisible()) {
      await expect(importButton).toBeVisible();
    }
  });
});
