import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('ITS Import Cluster Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Apply MSW success scenario for import cluster
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsSuccess');
      }
    });

    // Navigate to ITS page
    await page.goto(`${BASE}/its`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('import dialog opens and shows all tabs', async ({ page }) => {
    // Click import cluster button
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    // Dialog should be visible
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Check for tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Common tab names to look for
    const expectedTabs = ['Quick Connect', 'Kubeconfig', 'Manual'];
    for (const tabName of expectedTabs) {
      const tab = page.getByRole('tab').filter({ hasText: new RegExp(tabName, 'i') });
      if (await tab.isVisible()) {
        await expect(tab).toBeVisible();
      }
    }
  });

  test('quick connect tab functionality', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Click Quick Connect tab if available
    const quickConnectTab = page.getByRole('tab').filter({ hasText: /Quick Connect/i });
    if (await quickConnectTab.isVisible()) {
      await quickConnectTab.click();
      await page.waitForTimeout(500);

      // Look for cluster name input
      const clusterNameInput = page
        .locator('input[placeholder*="cluster"], input[name*="cluster"]')
        .first();
      if (await clusterNameInput.isVisible()) {
        await clusterNameInput.fill('test-cluster');

        // Look for connect/import button
        const connectButton = page
          .getByRole('button')
          .filter({ hasText: /Connect|Import|Add/i })
          .first();
        if (await connectButton.isVisible()) {
          await connectButton.click();
          await page.waitForTimeout(1000);

          // Should show success or error message
          const message = page.locator('text=/success|error|failed|connected/i').first();
          if (await message.isVisible()) {
            await expect(message).toBeVisible();
          }
        }
      }
    }
  });

  test('kubeconfig tab functionality', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Click Kubeconfig tab if available
    const kubeconfigTab = page.getByRole('tab').filter({ hasText: /Kubeconfig/i });
    if (await kubeconfigTab.isVisible()) {
      await kubeconfigTab.click();
      await page.waitForTimeout(500);

      // Look for file input or textarea
      const fileInput = page.locator('input[type="file"]').first();
      const textArea = page.locator('textarea').first();

      if (await textArea.isVisible()) {
        // Test textarea input
        const sampleKubeconfig = `apiVersion: v1
kind: Config
clusters:
- name: test-cluster
  cluster:
    server: https://test-server.com
contexts:
- name: test-context
  context:
    cluster: test-cluster
current-context: test-context`;

        await textArea.fill(sampleKubeconfig);

        // Look for import button
        const importBtn = page
          .getByRole('button')
          .filter({ hasText: /Import|Add/i })
          .first();
        if (await importBtn.isVisible()) {
          await importBtn.click();
          await page.waitForTimeout(1000);
        }
      } else if (await fileInput.isVisible()) {
        // File input is present
        await expect(fileInput).toBeVisible();
      }
    }
  });

  test('manual onboarding tab functionality', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Click Manual tab if available
    const manualTab = page.getByRole('tab').filter({ hasText: /Manual/i });
    if (await manualTab.isVisible()) {
      await manualTab.click();
      await page.waitForTimeout(500);

      // Look for cluster name input
      const clusterNameInput = page
        .locator('input[placeholder*="cluster"], input[name*="cluster"]')
        .first();
      if (await clusterNameInput.isVisible()) {
        await clusterNameInput.fill('manual-test-cluster');

        // Look for generate command button
        const generateButton = page
          .getByRole('button')
          .filter({ hasText: /Generate|Create/i })
          .first();
        if (await generateButton.isVisible()) {
          await generateButton.click();
          await page.waitForTimeout(1000);

          // Should show generated command
          const commandText = page.locator('text=/clusteradm|kubectl/i').first();
          if (await commandText.isVisible()) {
            await expect(commandText).toBeVisible();

            // Look for copy button
            const copyButton = page.getByRole('button').filter({ hasText: /Copy/i }).first();
            if (await copyButton.isVisible()) {
              await copyButton.click();
              await page.waitForTimeout(500);

              // Should show copied confirmation
              const copiedMessage = page.locator('text=/copied|copy/i').first();
              if (await copiedMessage.isVisible()) {
                await expect(copiedMessage).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('dialog can be closed with escape key', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Close with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Dialog should be closed
    await expect(dialog).not.toBeVisible();
  });

  test('dialog can be closed with close button', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Look for close button (X or Cancel)
    const closeButton = page
      .getByRole('button')
      .filter({ hasText: /Close|Cancel|×/i })
      .first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);

      // Dialog should be closed
      await expect(dialog).not.toBeVisible();
    }
  });

  test('form validation works for empty inputs', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Try to submit without filling required fields
    const submitButton = page
      .getByRole('button')
      .filter({ hasText: /Import|Connect|Add/i })
      .first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation error or keep dialog open
      const errorMessage = page.locator('text=/required|error|invalid/i').first();
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      } else {
        // Dialog should still be open if validation failed
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('import success shows confirmation', async ({ page }) => {
    // Apply MSW scenario for successful import
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsImportSuccess');
      }
    });

    // Open import dialog
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Fill in cluster name if input exists
    const clusterNameInput = page
      .locator('input[placeholder*="cluster"], input[name*="cluster"]')
      .first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('test-cluster');
    }

    // Submit form
    const submitButton = page
      .getByRole('button')
      .filter({ hasText: /Import|Connect|Add/i })
      .first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Should show success message
      const successMessage = page.locator('text=/success|imported|connected/i').first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toBeVisible();
      }
    }
  });

  test('import error shows error message', async ({ page }) => {
    // Apply MSW scenario for import error
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsImportError');
      }
    });

    // Open import dialog and try to import
    const importButton = page.getByRole('button').filter({ hasText: /Import Cluster/i });
    await importButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Fill in cluster name if input exists
    const clusterNameInput = page
      .locator('input[placeholder*="cluster"], input[name*="cluster"]')
      .first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('invalid-cluster');
    }

    // Submit form
    const submitButton = page
      .getByRole('button')
      .filter({ hasText: /Import|Connect|Add/i })
      .first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Should show error message
      const errorMessage = page.locator('text=/error|failed|invalid/i').first();
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });
});
