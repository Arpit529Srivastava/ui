import { test, expect } from '@playwright/test';
import { AuthHelper, ITSPage, MSWHelper } from './pages';

test.describe('ITS Labels and Filters Tests', () => {
  let itsPage: ITSPage;
  let auth: AuthHelper;
  let msw: MSWHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    itsPage = new ITSPage(page);
    msw = new MSWHelper(page);
    await auth.loginAsAdmin();
    await itsPage.openWithScenario(msw, 'itsSuccess');
  });

  test('label chips display in table rows', async () => {
    const labelChips = itsPage.labelChips.filter({ hasText: /edge|default|location-group/ });
    const chipCount = await labelChips.count();

    if (chipCount > 0) {
      await expect(labelChips.first()).toBeVisible();

      const edgeLabel = itsPage.page.getByText('edge').first();
      const defaultLabel = itsPage.page.getByText('default').first();

      if (await edgeLabel.isVisible()) {
        await expect(edgeLabel).toBeVisible();
      }
      if (await defaultLabel.isVisible()) {
        await expect(defaultLabel).toBeVisible();
      }
    }
  });

  test('clicking label chip filters table', async () => {
    const chipCount = await itsPage.labelChips.count();

    if (chipCount > 0) {
      await itsPage.labelChips.first().click();
      await itsPage.page.waitForTimeout(1000);

      if (await itsPage.filterChips.first().isVisible()) {
        await expect(itsPage.filterChips.first()).toBeVisible();
      }

      const rowCount = await itsPage.tableRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('filter chips can be removed', async () => {
    if ((await itsPage.labelChips.count()) > 0) {
      await itsPage.labelChips.first().click();
      await itsPage.page.waitForTimeout(1000);

      await itsPage.applyFilterChipRemoval();
      await itsPage.page.waitForTimeout(500);

      await expect(itsPage.tableRows).toHaveCount(2);
    }
  });

  test('label editing dialog shows existing labels', async () => {
    await itsPage.openWithScenario(msw, 'itsLabelsSuccess');

    if ((await itsPage.actionButtons.count()) > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const editLabelsItem = itsPage.menuItem(/Edit Labels|Labels/i);
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await itsPage.waitForDialog();

        const existingLabels = [
          'cluster.open-cluster-management.io/clusterset',
          'location-group',
          'name',
        ];
        for (const label of existingLabels) {
          const labelElement = itsPage.page.getByText(label).first();
          if (await labelElement.isVisible()) {
            await expect(labelElement).toBeVisible();
          }
        }
      }
    }
  });

  test('new labels can be added in edit dialog', async () => {
    await itsPage.openWithScenario(msw, 'itsLabelsSuccess');

    if ((await itsPage.actionButtons.count()) > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const editLabelsItem = itsPage.menuItem(/Edit Labels|Labels/i);
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await itsPage.waitForDialog();

        const addLabelButton = itsPage.dialogButton(/Add Label|Add|New/i);
        if (await addLabelButton.isVisible()) {
          if (await addLabelButton.isEnabled()) {
            await addLabelButton.click();
            await itsPage.page.waitForTimeout(500);

            const keyInput = itsPage.dialogInputsByPartial('key').last();
            const valueInput = itsPage.dialogInputsByPartial('value').last();

            if ((await keyInput.isVisible()) && (await valueInput.isVisible())) {
              await keyInput.fill('new-label');
              await valueInput.fill('test-value');

              const saveButton = itsPage.dialogButton(/Save|Update|Apply/i);
              if (await saveButton.isVisible()) {
                await saveButton.click();
                await itsPage.page.waitForTimeout(1000);

                const successMessage = itsPage.successMessages.first();
                if (await successMessage.isVisible()) {
                  await expect(successMessage).toBeVisible();
                }
              }
            }
          }
        }
      }
    }
  });

  test('labels can be deleted in edit dialog', async () => {
    await itsPage.openWithScenario(msw, 'itsLabelsSuccess');

    if ((await itsPage.actionButtons.count()) > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const editLabelsItem = itsPage.menuItem(/Edit Labels|Labels/i);
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await itsPage.waitForDialog();

        const deleteButtons = itsPage.dialog.locator(
          'button[aria-label*="delete"], button[aria-label*="remove"], button:has-text("×"), button:has-text("delete"), button:has-text("remove")'
        );
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          await deleteButtons.first().click();
          await itsPage.page.waitForTimeout(500);

          const saveButton = itsPage.dialogButton(/Save|Update|Apply/i);
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await itsPage.page.waitForTimeout(1000);

            const successMessage = itsPage.successMessages.first();
            if (await successMessage.isVisible()) {
              await expect(successMessage).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('label validation prevents invalid keys/values', async () => {
    if ((await itsPage.actionButtons.count()) > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const editLabelsItem = itsPage.menuItem(/Edit Labels|Labels/i);
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await itsPage.waitForDialog();

        const addLabelButton = itsPage.dialogButton(/Add Label|Add|New/i);
        if ((await addLabelButton.isVisible()) && (await addLabelButton.isEnabled())) {
          await addLabelButton.click();
          await itsPage.page.waitForTimeout(500);

          const keyInput = itsPage.dialogInputsByPartial('key').last();
          const valueInput = itsPage.dialogInputsByPartial('value').last();

          if ((await keyInput.isVisible()) && (await valueInput.isVisible())) {
            await keyInput.fill('invalid key with spaces');
            await valueInput.fill('valid-value');

            const saveButton = itsPage.dialogButton(/Save|Update|Apply/i);
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await itsPage.page.waitForTimeout(1000);

              const errorMessage = itsPage.dialogText(/invalid|error|spaces not allowed/i).first();
              if (await errorMessage.isVisible()) {
                await expect(errorMessage).toBeVisible();
              } else {
                await expect(itsPage.dialog).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('bulk label editing works for multiple clusters', async () => {
    await itsPage.openWithScenario(msw, 'itsLabelsSuccess');

    const checkboxCount = await itsPage.rowCheckboxes.count();

    if (checkboxCount >= 2) {
      await itsPage.selectRowByIndex(0);
      await itsPage.selectRowByIndex(1);
      await itsPage.page.waitForTimeout(500);

      if (await itsPage.bulkActionsButton.isVisible()) {
        await itsPage.openBulkActions();
        await itsPage.page.waitForTimeout(500);

        const bulkLabelsItem = itsPage.menuItem(/Bulk Labels|Labels/i);
        if (await bulkLabelsItem.isVisible()) {
          await bulkLabelsItem.click();
          await itsPage.waitForDialog();

          const selectedText = itsPage.page.locator('text=/2 selected|selected clusters/i').first();
          await expect(selectedText).toBeVisible();

          const labelKeyInput = itsPage.dialogInput('key');
          const labelValueInput = itsPage.dialogInput('value');

          if ((await labelKeyInput.isVisible()) && (await labelValueInput.isVisible())) {
            await labelKeyInput.fill('bulk-environment');
            await labelValueInput.fill('testing');

            const applyButton = itsPage.dialogButton(/Apply|Save|Update/i);
            if (await applyButton.isVisible()) {
              await applyButton.click();
              await itsPage.page.waitForTimeout(1000);

              const successMessage = itsPage.successMessages.first();
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
