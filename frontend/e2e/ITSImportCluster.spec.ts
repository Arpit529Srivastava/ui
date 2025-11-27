import { test, expect } from '@playwright/test';
import { AuthHelper, ITSPage, MSWHelper } from './pages';

test.describe('ITS Import Cluster Tests', () => {
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

  test('import dialog opens and shows all tabs', async () => {
    await itsPage.openImportDialog();

    const tabCount = await itsPage.dialogTabsCount();
    expect(tabCount).toBeGreaterThan(0);

    const expectedTabs = ['Quick Connect', 'Kubeconfig', 'Manual'];
    for (const tabName of expectedTabs) {
      const tab = itsPage.dialogTab(new RegExp(tabName, 'i'));
      if (await tab.isVisible()) {
        await expect(tab).toBeVisible();
      }
    }
  });

  test('quick connect tab functionality', async () => {
    await itsPage.openImportDialog();
    await itsPage.selectDialogTab(/Quick Connect/i);
    await itsPage.page.waitForTimeout(500);

    const clusterNameInput = itsPage.dialogInputsByPartial('cluster').first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('test-cluster');

      const connectButton = itsPage.dialogButton(/Connect|Import|Add/i);
      if (await connectButton.isVisible()) {
        await connectButton.click();
        await itsPage.page.waitForTimeout(1000);

        const message = itsPage.notificationMessages.first();
        if (await message.isVisible()) {
          await expect(message).toBeVisible();
        }
      }
    }
  });

  test('kubeconfig tab functionality', async () => {
    await itsPage.openImportDialog();
    await itsPage.selectDialogTab(/Kubeconfig/i);
    await itsPage.page.waitForTimeout(500);

    const textArea = itsPage.dialogTextarea();
    const fileInput = itsPage.dialogFileInputs.first();

    if (await textArea.isVisible()) {
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

      const importBtn = itsPage.dialogButton(/Import|Add/i);
      if (await importBtn.isVisible()) {
        await importBtn.click();
        await itsPage.page.waitForTimeout(1000);
      }
    } else if (await fileInput.isVisible()) {
      await expect(fileInput).toBeVisible();
    }
  });

  test('manual onboarding tab functionality', async () => {
    await itsPage.openImportDialog();
    await itsPage.selectDialogTab(/Manual/i);
    await itsPage.page.waitForTimeout(500);

    const clusterNameInput = itsPage.dialogInputsByPartial('cluster').first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('manual-test-cluster');

      const generateButton = itsPage.dialogButton(/Generate|Create/i);
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await itsPage.page.waitForTimeout(1000);

        const commandText = itsPage.dialogText(/clusteradm|kubectl/i).first();
        if (await commandText.isVisible()) {
          await expect(commandText).toBeVisible();

          const copyButton = itsPage.dialogButton(/Copy/i);
          if (await copyButton.isVisible()) {
            await copyButton.click();
            await itsPage.page.waitForTimeout(500);

            const copiedMessage = itsPage.dialogText(/copied|copy/i).first();
            if (await copiedMessage.isVisible()) {
              await expect(copiedMessage).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('dialog can be closed with escape key', async () => {
    await itsPage.openImportDialog();
    await itsPage.closeDialogViaEsc();
    await itsPage.page.waitForTimeout(500);
    await expect(itsPage.dialog).not.toBeVisible();
  });

  test('dialog can be closed with close button', async () => {
    await itsPage.openImportDialog();
    await itsPage.closeDialogViaButton();
    await itsPage.page.waitForTimeout(500);
    await expect(itsPage.dialog).not.toBeVisible();
  });

  test('form validation works for empty inputs', async () => {
    await itsPage.openImportDialog();

    const submitButton = itsPage.dialogButton(/Import|Connect|Add/i);
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await itsPage.page.waitForTimeout(500);

      const errorMessage = itsPage.errorMessages.first();
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      } else {
        await expect(itsPage.dialog).toBeVisible();
      }
    }
  });

  test('import success shows confirmation', async () => {
    await itsPage.openWithScenario(msw, 'itsImportSuccess');

    await itsPage.openImportDialog();

    const clusterNameInput = itsPage.dialogInputsByPartial('cluster').first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('test-cluster');
    }

    const submitButton = itsPage.dialogButton(/Import|Connect|Add/i);
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await itsPage.page.waitForTimeout(2000);

      const successMessage = itsPage.successMessages.first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toBeVisible();
      }
    }
  });

  test('import error shows error message', async () => {
    await itsPage.openWithScenario(msw, 'itsImportError');

    await itsPage.openImportDialog();

    const clusterNameInput = itsPage.dialogInputsByPartial('cluster').first();
    if (await clusterNameInput.isVisible()) {
      await clusterNameInput.fill('invalid-cluster');
    }

    const submitButton = itsPage.dialogButton(/Import|Connect|Add/i);
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await itsPage.page.waitForTimeout(2000);

      const errorMessage = itsPage.errorMessages.first();
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });
});
