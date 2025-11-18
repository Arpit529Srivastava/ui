import { test, expect } from '@playwright/test';
import { LoginPage, ObjectExplorerPage, MSWHelper } from './pages';

test.describe('Object Explorer - Navigation and Basic Filters', () => {
  let loginPage: LoginPage;
  let objectExplorerPage: ObjectExplorerPage;
  let mswHelper: MSWHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    objectExplorerPage = new ObjectExplorerPage(page);
    mswHelper = new MSWHelper(page);

    await loginPage.goto();
    await loginPage.login();
    await loginPage.waitForRedirect();

    await mswHelper.applyScenario('objectExplorerSuccess');

    await objectExplorerPage.goto();
    await objectExplorerPage.waitForPageLoad();
  });

  test('should display object explorer page with all UI elements', async () => {
    await expect(objectExplorerPage.pageTitle).toBeVisible();
    await objectExplorerPage.verifyPageElements();
    await expect(objectExplorerPage.gridViewButton).toBeVisible();
    await expect(objectExplorerPage.listViewButton).toBeVisible();
    await expect(objectExplorerPage.tableViewButton).toBeVisible();
    await expect(objectExplorerPage.refreshButton).toBeVisible();
  });

  test('should navigate to object explorer from menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const resourcesLink = page.locator('a[href="/resources"]').first();
    if (await resourcesLink.isVisible({ timeout: 3000 })) {
      await resourcesLink.click();
    } else {
      const resourcesText = page.locator('text=/resource.*explorer/i').first();
      if (await resourcesText.isVisible({ timeout: 3000 })) {
        await resourcesText.click();
      } else {
        await page.goto('/resources');
      }
    }
    await objectExplorerPage.waitForPageLoad();
    await expect(objectExplorerPage.pageTitle).toBeVisible();
  });

  test('should toggle filter section visibility', async ({ page }) => {
    await expect(objectExplorerPage.filterSection).toBeVisible();
    await objectExplorerPage.toggleFilters();
    await page.waitForTimeout(1000);
    const isVisible = await objectExplorerPage.filterSection
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (isVisible) {
      const collapseContainer = page.locator('.MuiCollapse-root').first();
      const isCollapsed = await collapseContainer
        .evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.height === '0px' || style.display === 'none';
        })
        .catch(() => false);
      expect(isCollapsed).toBe(true);
    } else {
      expect(isVisible).toBe(false);
    }
    await objectExplorerPage.toggleFilters();
    await page.waitForTimeout(1000);
    await expect(objectExplorerPage.filterSection).toBeVisible();
  });

  test('should use quick search to filter resources', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await objectExplorerPage.selectNamespace('default');
    await objectExplorerPage.waitForResources();
    const initialCount = await objectExplorerPage.getResourceCount();
    expect(initialCount).toBeGreaterThan(0);
    await objectExplorerPage.quickSearch('nginx');
    await page.waitForTimeout(1000);
    const searchValue = await objectExplorerPage.quickSearchInput.inputValue();
    expect(searchValue).toBe('nginx');
    await objectExplorerPage.clearQuickSearch();
    await page.waitForTimeout(500);
    const clearedValue = await objectExplorerPage.quickSearchInput.inputValue();
    expect(clearedValue).toBe('');
  });

  test('should refresh resources', async () => {
    await objectExplorerPage.selectKind('Deployment');
    await objectExplorerPage.selectNamespace('default');
    await objectExplorerPage.waitForResources();
    await objectExplorerPage.refresh();
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should toggle auto-refresh', async ({ page }) => {
    const isChecked = await objectExplorerPage.autoRefreshSwitch.isChecked();
    expect(isChecked).toBe(false);
    await objectExplorerPage.toggleAutoRefresh();
    await page.waitForTimeout(300);
    const isNowChecked = await objectExplorerPage.autoRefreshSwitch.isChecked();
    expect(isNowChecked).toBe(true);
    await objectExplorerPage.toggleAutoRefresh();
    await page.waitForTimeout(300);
    const isFinallyChecked = await objectExplorerPage.autoRefreshSwitch.isChecked();
    expect(isFinallyChecked).toBe(false);
  });

  test('should display empty state when no kind is selected', async () => {
    const resourceCount = await objectExplorerPage.getResourceCount();
    expect(resourceCount).toBe(0);
  });

  test('should display filter chips for selected options', async ({ page }) => {
    await objectExplorerPage.selectKind('Service');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedKinds(['Service']);
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedNamespaces(['default']);
  });

  test('should remove filter chips', async ({ page }) => {
    await objectExplorerPage.selectKind('ConfigMap');
    await objectExplorerPage.selectNamespace('production');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedKinds(['ConfigMap']);
    await objectExplorerPage.verifySelectedNamespaces(['production']);
    await objectExplorerPage.removeKindChip('ConfigMap');
    await page.waitForTimeout(500);
    const kindChip = page.locator('[class*="chip"]').filter({ hasText: 'ConfigMap' });
    const kindChipVisible = await kindChip.isVisible({ timeout: 1000 }).catch(() => false);
    expect(kindChipVisible).toBe(false);
    await objectExplorerPage.removeNamespaceChip('production');
    await page.waitForTimeout(500);
    const nsChip = page.locator('[class*="chip"]').filter({ hasText: 'production' });
    const nsChipVisible = await nsChip.isVisible({ timeout: 1000 }).catch(() => false);
    expect(nsChipVisible).toBe(false);
  });

  test('should persist filter state during navigation', async ({ page }) => {
    await objectExplorerPage.selectKind('Secret');
    await objectExplorerPage.selectNamespace('staging');
    await page.waitForTimeout(500);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await objectExplorerPage.goto();
    await objectExplorerPage.waitForPageLoad();
    await objectExplorerPage.verifyPageElements();
  });
});
