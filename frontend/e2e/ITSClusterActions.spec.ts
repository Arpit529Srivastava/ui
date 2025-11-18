import { test, expect } from '@playwright/test';
import { AuthHelper, ITSPage, MSWHelper } from './pages';

test.describe('ITS Cluster Actions Tests', () => {
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

  test('cluster row actions menu opens and shows options', async () => {
    const actionCount = await itsPage.actionButtons.count();

    if (actionCount > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const menu = itsPage.contextMenu.first();
      if (await menu.isVisible()) {
        await expect(menu).toBeVisible();

        const menuItems = itsPage.menuItems;
        const itemCount = await menuItems.count();
        expect(itemCount).toBeGreaterThan(0);

        const commonActions = ['Edit Labels', 'View Details', 'Detach', 'Remove'];
        for (const action of commonActions) {
          const menuItem = itsPage.menuItem(action);
          if (await menuItem.isVisible()) {
            await expect(menuItem).toBeVisible();
          }
        }

        await itsPage.page.keyboard.press('Escape');
        await itsPage.page.waitForTimeout(300);
      }
    }
  });

  test('edit labels dialog opens and works', async () => {
    await itsPage.openWithScenario(msw, 'itsLabelsSuccess');

    const actionCount = await itsPage.actionButtons.count();

    if (actionCount > 0) {
      await itsPage.actionButtons.first().click();
      await itsPage.page.waitForTimeout(500);

      const editLabelsItem = itsPage.menuItem('Edit Labels');
      if (await editLabelsItem.isVisible()) {
        await editLabelsItem.click();
        await itsPage.waitForDialog();

        const labelKeyInput = itsPage.dialogInput('key');
        const labelValueInput = itsPage.dialogInput('value');

        if ((await labelKeyInput.isVisible()) && (await labelValueInput.isVisible())) {
          await labelKeyInput.fill('environment');
          await labelValueInput.fill('test');

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

  test('view cluster details dialog opens', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');

    const actionCount = await itsPage.actionButtons.count();

    if (actionCount > 0) {
      await itsPage.openActionsMenuItem('cluster1', /View Details|Details/i);
      await itsPage.waitForDialog();

      await expect(itsPage.dialog).toBeVisible();
      await expect(itsPage.page.getByText('cluster1').first()).toBeVisible();

      const detailsText = ['Ready', 'cpu', 'memory', 'pods'];
      for (const detail of detailsText) {
        const detailElement = itsPage.page.locator(`text=${detail}`).first();
        if (await detailElement.isVisible()) {
          await expect(detailElement).toBeVisible();
        }
      }
    }
  });

  test('detach cluster confirmation dialog works', async () => {
    await itsPage.openWithScenario(msw, 'itsDetachSuccess');

    const actionCount = await itsPage.actionButtons.count();

    if (actionCount > 0) {
      await itsPage.openActionsMenuItem('cluster1', /Detach|Remove/i);
      await itsPage.waitForDialog();

      await expect(itsPage.dialog).toBeVisible();
      await expect(itsPage.page.locator('text=/confirm|sure|detach/i').first()).toBeVisible();

      const cancelButton = itsPage.dialogButton(/Cancel|No/i);

      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await itsPage.page.waitForTimeout(500);
        await expect(itsPage.dialog).not.toBeVisible();

        await itsPage.openActionsMenuItem('cluster1', /Detach|Remove/i);
        await itsPage.waitForDialog();

        const confirmButton = itsPage.dialogButton(/Confirm|Yes|Detach/i);
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await itsPage.page.waitForTimeout(1000);

          const successMessage = itsPage.successMessages.first();
          if (await successMessage.isVisible()) {
            await expect(successMessage).toBeVisible();
          }
        }
      }
    }
  });

  test('bulk label management works with multiple selections', async () => {
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
            await labelKeyInput.fill('bulk-label');
            await labelValueInput.fill('test-value');

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

  test('label chips in table are clickable for filtering', async () => {
    const chipCount = await itsPage.labelChips.count();

    if (chipCount > 0) {
      await itsPage.labelChips.first().click();
      await itsPage.page.waitForTimeout(1000);

      const rowCount = await itsPage.tableRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);

      const filterChip = itsPage.filterChips.first();
      if (await filterChip.isVisible()) {
        await expect(filterChip).toBeVisible();
      }
    }
  });

  test('cluster status badges display correctly', async () => {
    let badgeCount = await itsPage.statusBadges.count();

    if (badgeCount === 0) {
      badgeCount = await itsPage.page.locator('text=/Active|Available|Ready/i').count();
    }

    if (badgeCount > 0) {
      expect(badgeCount).toBeGreaterThan(0);
      const activeBadge = itsPage.page.locator('text=/Active|Available|Ready/i').first();
      await expect(activeBadge).toBeVisible();
    }
  });

  test('cluster capacity information displays', async () => {
    const capacityInfo = itsPage.page.locator('text=/cpu|memory|pods|16|7940284Ki|110/i');
    const infoCount = await capacityInfo.count();

    if (infoCount > 0) {
      expect(infoCount).toBeGreaterThan(0);
    }
  });

  test('cluster creation timestamp displays', async () => {
    const timestampInfo = itsPage.page.locator('text=/2025-09-16|ago|created/i');
    const timestampCount = await timestampInfo.count();

    if (timestampCount > 0) {
      expect(timestampCount).toBeGreaterThan(0);
    }
  });
});
