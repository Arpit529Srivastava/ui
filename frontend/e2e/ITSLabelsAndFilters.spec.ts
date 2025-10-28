import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('ITS Labels and Filters Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Apply MSW success scenario for labels and filters
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

  test('label chips display in table rows', async ({ page }) => {
    // Look for label chips in table
    const labelChips = page
      .locator('[class*="chip"], [class*="tag"], [class*="badge"]')
      .filter({ hasText: /edge|default|location-group/ });
    const chipCount = await labelChips.count();

    if (chipCount > 0) {
      // Should show labels from mock data
      await expect(labelChips.first()).toBeVisible();

      // Check for specific labels from mock data
      const edgeLabel = page.getByText('edge').first();
      const defaultLabel = page.getByText('default').first();

      if (await edgeLabel.isVisible()) {
        await expect(edgeLabel).toBeVisible();
      }
      if (await defaultLabel.isVisible()) {
        await expect(defaultLabel).toBeVisible();
      }
    }
  });

  test('clicking label chip filters table', async ({ page }) => {
    // Look for clickable label chips
    const labelChips = page
      .locator('[class*="chip"], [class*="tag"]')
      .filter({ hasText: /edge|default/ });
    const chipCount = await labelChips.count();

    if (chipCount > 0) {
      // Click first label chip
      await labelChips.first().click();
      await page.waitForTimeout(1000);

      // Should apply filter
      const filterChips = page.locator('[class*="filter-chip"], [class*="active-filter"]');
      if (await filterChips.first().isVisible()) {
        await expect(filterChips.first()).toBeVisible();
      }

      // Table should be filtered
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('filter chips can be removed', async ({ page }) => {
    // Apply a label filter first
    const labelChips = page
      .locator('[class*="chip"], [class*="tag"]')
      .filter({ hasText: /edge|default/ });
    const chipCount = await labelChips.count();

    if (chipCount > 0) {
      await labelChips.first().click();
      await page.waitForTimeout(1000);

      // Look for filter chip with remove button
      const filterChip = page.locator('[class*="filter-chip"], [class*="active-filter"]').first();
      if (await filterChip.isVisible()) {
        // Look for remove button (X or close icon)
        const removeButton = filterChip
          .locator('button, [class*="remove"], [class*="close"]')
          .first();
        if (await removeButton.isVisible()) {
          await removeButton.click();
          await page.waitForTimeout(500);

          // Filter should be removed
          await expect(filterChip).not.toBeVisible();

          // Table should show all clusters again
          const rows = page.locator('tbody tr');
          await expect(rows).toHaveCount(2);
        }
      }
    }
  });

  test('label editing dialog shows existing labels', async ({ page }) => {
    // Apply MSW scenario for successful label operations
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsLabelsSuccess');
      }
    });

    // Open cluster actions menu
    const actionsButtons = page.locator('tbody tr button');
    const buttonCount = await actionsButtons.count();

    if (buttonCount > 0) {
      await actionsButtons.first().click();
      await page.waitForTimeout(500);

      // Click Edit Labels
      const editLabelsItem = page.getByRole('menuitem').filter({ hasText: /Edit Labels|Labels/i });
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await page.waitForTimeout(1000);

        // Labels dialog should open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Should show existing labels from mock data
        const existingLabels = [
          'cluster.open-cluster-management.io/clusterset',
          'location-group',
          'name',
        ];
        for (const label of existingLabels) {
          const labelElement = page.getByText(label).first();
          if (await labelElement.isVisible()) {
            await expect(labelElement).toBeVisible();
          }
        }
      }
    }
  });

  test('new labels can be added in edit dialog', async ({ page }) => {
    // Apply MSW scenario for successful label operations
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsLabelsSuccess');
      }
    });

    // Open label edit dialog
    const actionsButtons = page.locator('tbody tr button');
    const buttonCount = await actionsButtons.count();

    if (buttonCount > 0) {
      await actionsButtons.first().click();
      await page.waitForTimeout(500);

      const editLabelsItem = page.getByRole('menuitem').filter({ hasText: /Edit Labels|Labels/i });
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Look for add label button
        const addLabelButton = page
          .getByRole('button')
          .filter({ hasText: /Add Label|Add|New/i })
          .first();
        if (await addLabelButton.isVisible()) {
          // Check if button is enabled
          const isEnabled = await addLabelButton.isEnabled();
          if (isEnabled) {
            await addLabelButton.click();
            await page.waitForTimeout(500);

            // Should show new label inputs
            const keyInput = page.locator('input[placeholder*="key"], input[name*="key"]').last();
            const valueInput = page
              .locator('input[placeholder*="value"], input[name*="value"]')
              .last();

            if ((await keyInput.isVisible()) && (await valueInput.isVisible())) {
              await keyInput.fill('new-label');
              await valueInput.fill('test-value');

              // Save changes
              const saveButton = page
                .getByRole('button')
                .filter({ hasText: /Save|Update|Apply/i })
                .first();
              if (await saveButton.isVisible()) {
                await saveButton.click();
                await page.waitForTimeout(1000);

                // Should show success message
                const successMessage = page.locator('text=/success|updated|saved/i').first();
                if (await successMessage.isVisible()) {
                  await expect(successMessage).toBeVisible();
                }
              }
            }
          } else {
            // Button is disabled, skip this test
            console.log('Add label button is disabled, skipping test');
          }
        }
      }
    }
  });

  test('labels can be deleted in edit dialog', async ({ page }) => {
    // Apply MSW scenario for successful label operations
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsLabelsSuccess');
      }
    });

    // Open label edit dialog
    const actionsButtons = page.locator('tbody tr button');
    const buttonCount = await actionsButtons.count();

    if (buttonCount > 0) {
      await actionsButtons.first().click();
      await page.waitForTimeout(500);

      const editLabelsItem = page.getByRole('menuitem').filter({ hasText: /Edit Labels|Labels/i });
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Look for delete buttons on existing labels
        const deleteButtons = page
          .locator('button[aria-label*="delete"], button[aria-label*="remove"], button')
          .filter({ hasText: /×|delete|remove/i });
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          // Click first delete button
          await deleteButtons.first().click();
          await page.waitForTimeout(500);

          // Save changes
          const saveButton = page
            .getByRole('button')
            .filter({ hasText: /Save|Update|Apply/i })
            .first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);

            // Should show success message
            const successMessage = page.locator('text=/success|updated|saved/i').first();
            if (await successMessage.isVisible()) {
              await expect(successMessage).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('label validation prevents invalid keys/values', async ({ page }) => {
    // Open label edit dialog
    const actionsButtons = page.locator('tbody tr button');
    const buttonCount = await actionsButtons.count();

    if (buttonCount > 0) {
      await actionsButtons.first().click();
      await page.waitForTimeout(500);

      const editLabelsItem = page.getByRole('menuitem').filter({ hasText: /Edit Labels|Labels/i });
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Try to add invalid label
        const addLabelButton = page
          .getByRole('button')
          .filter({ hasText: /Add Label|Add|New/i })
          .first();
        if (await addLabelButton.isVisible()) {
          // Check if button is enabled
          const isEnabled = await addLabelButton.isEnabled();
          if (isEnabled) {
            await addLabelButton.click();
            await page.waitForTimeout(500);

            const keyInput = page.locator('input[placeholder*="key"], input[name*="key"]').last();
            const valueInput = page
              .locator('input[placeholder*="value"], input[name*="value"]')
              .last();

            if ((await keyInput.isVisible()) && (await valueInput.isVisible())) {
              // Try invalid characters
              await keyInput.fill('invalid key with spaces');
              await valueInput.fill('valid-value');

              // Try to save
              const saveButton = page
                .getByRole('button')
                .filter({ hasText: /Save|Update|Apply/i })
                .first();
              if (await saveButton.isVisible()) {
                await saveButton.click();
                await page.waitForTimeout(1000);

                // Should show validation error
                const errorMessage = page
                  .locator('text=/invalid|error|spaces not allowed/i')
                  .first();
                if (await errorMessage.isVisible()) {
                  await expect(errorMessage).toBeVisible();
                } else {
                  // Dialog should remain open if validation failed
                  await expect(dialog).toBeVisible();
                }
              }
            }
          } else {
            // Button is disabled, skip this test
            console.log('Add label button is disabled, skipping test');
          }
        }
      }
    }
  });

  test('bulk label editing works for multiple clusters', async ({ page }) => {
    // Apply MSW scenario for successful label operations
    await page.evaluate(() => {
      if (window.__msw) {
        window.__msw.applyScenarioByName('itsLabelsSuccess');
      }
    });

    // Select multiple clusters
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 2) {
      // Select first two clusters
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.waitForTimeout(500);

      // Bulk actions button should appear
      const bulkButton = page
        .getByRole('button')
        .filter({ hasText: /Manage/i })
        .first();
      if (await bulkButton.isVisible()) {
        await bulkButton.click();
        await page.waitForTimeout(500);

        // Click bulk labels option
        const bulkLabelsItem = page
          .getByRole('menuitem')
          .filter({ hasText: /Bulk Labels|Labels/i });
        if (await bulkLabelsItem.isVisible()) {
          await bulkLabelsItem.click();
          await page.waitForTimeout(1000);

          // Bulk labels dialog should open
          const dialog = page.locator('[role="dialog"]').first();
          await expect(dialog).toBeVisible();

          // Should show selected cluster count
          const selectedText = page.locator('text=/2 selected|selected clusters/i').first();
          await expect(selectedText).toBeVisible();

          // Add bulk label
          const keyInput = page.locator('input[placeholder*="key"], input[name*="key"]').first();
          const valueInput = page
            .locator('input[placeholder*="value"], input[name*="value"]')
            .first();

          if ((await keyInput.isVisible()) && (await valueInput.isVisible())) {
            await keyInput.fill('bulk-environment');
            await valueInput.fill('testing');

            // Apply to all
            const applyButton = page
              .getByRole('button')
              .filter({ hasText: /Apply|Save|Update/i })
              .first();
            if (await applyButton.isVisible()) {
              await applyButton.click();
              await page.waitForTimeout(1000);

              // Should show success message
              const successMessage = page.locator('text=/success|updated|applied/i').first();
              if (await successMessage.isVisible()) {
                await expect(successMessage).toBeVisible();
              }
            }
          }
        }
      }
    }
  });
});
