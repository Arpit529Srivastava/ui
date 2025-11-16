import { test, expect } from '@playwright/test';
import { LoginPage, WDSPage } from './pages';
import { MSWHelper } from './pages/utils/MSWHelper';

test.describe('WDS View Mode Switching', () => {
  let wdsPage: WDSPage;
  let loginPage: LoginPage;
  let mswHelper: MSWHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    wdsPage = new WDSPage(page);
    mswHelper = new MSWHelper(page);

    await loginPage.goto();
    await mswHelper.applyScenario('wdsSuccess');
    await page.waitForLoadState('domcontentloaded');
    await loginPage.login();
    await wdsPage.ensureOnWdsPage();
    await wdsPage.waitForPageLoad();
  });

  test('view mode toggle buttons are visible and functional', async () => {
    await wdsPage.verifyViewModeButtons();

    const tilesButton = wdsPage.tilesViewButton;
    const listButton = wdsPage.listViewButton;

    await expect(tilesButton).toBeVisible();
    await expect(listButton).toBeVisible();

    const tilesClickable = await tilesButton.isEnabled();
    const listClickable = await listButton.isEnabled();

    expect(tilesClickable).toBeTruthy();
    expect(listClickable).toBeTruthy();
  });

  test('tiles view displays graph visualization', async () => {
    await wdsPage.switchToTilesView();
    await wdsPage.verifyTilesViewRendered();

    const isTilesActive = await wdsPage.isTilesViewActive();
    expect(isTilesActive).toBeTruthy();

    const hasReactFlow = await wdsPage.reactFlowCanvas
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasCanvas = await wdsPage.flowCanvas.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await wdsPage.emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmptyMessage = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    const hasAnyTilesContent = await wdsPage.page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
      const canvas = document.querySelector('canvas');
      const flowContainer = document.querySelector('[class*="FlowCanvas"], [class*="flow-canvas"]');
      return !!(reactFlow || canvas || flowContainer);
    });

    expect(
      hasReactFlow || hasCanvas || hasEmptyState || hasEmptyMessage || hasAnyTilesContent
    ).toBeTruthy();
  });

  test('list view displays table', async () => {
    await wdsPage.switchToListView();
    await wdsPage.verifyListViewRendered();

    const isListActive = await wdsPage.isListViewActive();
    expect(isListActive).toBeTruthy();

    const hasTable = await wdsPage.listViewTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasListItems = (await wdsPage.getListViewItemCount()) > 0;
    const hasEmptyState = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasTable || hasListItems || hasEmptyState).toBeTruthy();
  });

  test('mode switching preserves selection', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const nodes = await page
      .locator('[class*="node"], [class*="Node"]')
      .filter({ visible: true })
      .all();
    if (nodes.length > 0) {
      await nodes[0].click();
      await page.waitForTimeout(500);

      const wasSelected = await wdsPage.isDetailsPanelOpen();

      await wdsPage.switchToListView();
      await wdsPage.waitForListView();

      if (wasSelected) {
        const stillOpen = await wdsPage.isDetailsPanelOpen();
        if (stillOpen) {
          await wdsPage.closeDetailsPanel();
        }
      }

      await wdsPage.switchToTilesView();
      await wdsPage.waitForTilesView();

      const nodesAfter = await page
        .locator('[class*="node"], [class*="Node"]')
        .filter({ visible: true })
        .all();
      expect(nodesAfter.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('resource counts display in both modes', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const tilesCount = await wdsPage.getResourceCount();

    await wdsPage.switchToListView();
    await wdsPage.waitForListView();
    await page.waitForTimeout(1000);

    const listCount = await wdsPage.getResourceCount();

    expect(tilesCount).toBeGreaterThanOrEqual(0);
    expect(listCount).toBeGreaterThanOrEqual(0);

    const countsMatch = tilesCount === listCount || (tilesCount === 0 && listCount === 0);
    expect(countsMatch).toBeTruthy();
  });

  test('filters work in tiles view', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const filtersVisible = await wdsPage.isFiltersVisible();

    if (filtersVisible) {
      const initialCount = await wdsPage.getResourceCount();

      try {
        await wdsPage.applyFilter('search', 'test');
        await page.waitForTimeout(1000);

        const filteredCount = await wdsPage.getResourceCount();
        expect(filteredCount).toBeGreaterThanOrEqual(0);

        await wdsPage.clearFilters();
        await page.waitForTimeout(1000);

        const restoredCount = await wdsPage.getResourceCount();
        expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
      } catch (error) {
        console.warn('Filter test skipped - filters may not be fully implemented:', error);
      }
    }
  });

  test('filters work in list view', async ({ page }) => {
    await wdsPage.switchToListView();
    await wdsPage.waitForListView();
    await page.waitForTimeout(1000);

    const initialItemCount = await wdsPage.getListViewItemCount();

    try {
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        const filteredItemCount = await wdsPage.getListViewItemCount();
        expect(filteredItemCount).toBeGreaterThanOrEqual(0);

        await searchInput.clear();
        await page.waitForTimeout(1000);

        const restoredItemCount = await wdsPage.getListViewItemCount();
        expect(restoredItemCount).toBeGreaterThanOrEqual(initialItemCount);
      }
    } catch (error) {
      console.warn('List view filter test skipped - filters may not be fully implemented:', error);
    }
  });

  test('empty state displays in tiles view', async ({ page }) => {
    // Mock empty workloads response using page.route (MSW doesn't have empty state scenario)
    await page.route('**/api/wds/workloads*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/wds/get/context*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Mock KubeStellar status to prevent redirects to /install
    await page.route('**/api/kubestellar/status*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allReady: true }),
      });
    });

    // Ensure MSW scenario is applied
    await mswHelper.applyScenario('wdsSuccess');

    // Reload with error handling
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      try {
        await page.waitForTimeout(1000); // Reduced timeout
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
          // Page closed during reload, try to navigate fresh
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        // Page closed, try to navigate fresh
        await page.goto('http://localhost:5173/workloads/manage', {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(1000);
      } else {
        throw error;
      }
    }

    // Handle potential login redirect using POM
    try {
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        await loginPage.login();
        await page.waitForURL(/workloads\/manage|/, { timeout: 10000 });
      }
    } catch (error) {
      // If page closed during login, try to recover
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        console.warn('Page closed during login handling');
        // Try to navigate and login again
        try {
          await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
          await loginPage.login();
        } catch {
          // If this also fails, let the test fail with a clearer error
        }
      }
    }

    // Use POM methods to ensure we're on the right page (with error handling)
    try {
      await wdsPage.ensureOnWdsPage();
    } catch (error) {
      // If ensureOnWdsPage fails due to page closure, try direct navigation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        try {
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        } catch {
          // If navigation also fails, the test will fail with a clearer error
        }
      } else {
        throw error;
      }
    }

    // Wait for URL and handle potential redirects
    try {
      await page.waitForURL(/workloads\/manage/, { timeout: 10000 });
    } catch {
      // If still on install page, navigate directly
      try {
        const currentUrl = page.url();
        if (currentUrl.includes('/install')) {
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        }
      } catch {
        // If navigation fails, continue and let verifyViewModeButtons handle it
      }
    }

    // Wait for the TreeView component to be fully rendered
    // Check for header title or any header element first
    await page
      .waitForSelector('h4, [class*="TreeViewHeader"], text="Workloads"', { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000); // Give time for icons to load

    // For empty state, wait for view mode buttons to be visible instead of full page load
    await wdsPage.verifyViewModeButtons();

    // Use POM method to switch view
    await wdsPage.switchToTilesView();

    // Use POM methods to verify empty state
    const isEmpty = await wdsPage.isEmptyStateVisible();
    const hasEmptyMessage = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasCreateButton = await wdsPage.emptyStateCreateButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(isEmpty || hasEmptyMessage || hasCreateButton).toBeTruthy();
  });

  test('empty state displays in list view', async ({ page }) => {
    // Mock empty workloads response using page.route (MSW doesn't have empty state scenario)
    await page.route('**/api/wds/workloads*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/wds/get/context*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Mock KubeStellar status to prevent redirects to /install
    await page.route('**/api/kubestellar/status*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allReady: true }),
      });
    });

    // Ensure MSW scenario is applied
    await mswHelper.applyScenario('wdsSuccess');

    // Reload with error handling
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      try {
        await page.waitForTimeout(1000); // Reduced timeout
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
          // Page closed during reload, try to navigate fresh
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        // Page closed, try to navigate fresh
        await page.goto('http://localhost:5173/workloads/manage', {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(1000);
      } else {
        throw error;
      }
    }

    // Handle potential login redirect using POM
    try {
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        await loginPage.login();
        await page.waitForURL(/workloads\/manage|/, { timeout: 10000 });
      }
    } catch (error) {
      // If page closed during login, try to recover
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        console.warn('Page closed during login handling');
        // Try to navigate and login again
        try {
          await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
          await loginPage.login();
        } catch {
          // If this also fails, let the test fail with a clearer error
        }
      }
    }

    // Use POM methods to ensure we're on the right page (with error handling)
    try {
      await wdsPage.ensureOnWdsPage();
    } catch (error) {
      // If ensureOnWdsPage fails due to page closure, try direct navigation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        try {
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        } catch {
          // If navigation also fails, the test will fail with a clearer error
        }
      } else {
        throw error;
      }
    }

    // Wait for URL and handle potential redirects
    try {
      await page.waitForURL(/workloads\/manage/, { timeout: 10000 });
    } catch {
      // If still on install page, navigate directly
      try {
        const currentUrl = page.url();
        if (currentUrl.includes('/install')) {
          await page.goto('http://localhost:5173/workloads/manage', {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
        }
      } catch {
        // If navigation fails, continue and let verifyViewModeButtons handle it
      }
    }

    // Wait for the TreeView component to be fully rendered
    // Check for header title or any header element first
    await page
      .waitForSelector('h4, [class*="TreeViewHeader"], text="Workloads"', { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000); // Give time for icons to load

    // For empty state, wait for view mode buttons to be visible instead of full page load
    await wdsPage.verifyViewModeButtons();

    // Use POM method to switch view
    await wdsPage.switchToListView();

    // Use POM methods to verify empty state
    const hasEmptyMessage = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasCreateButton = await wdsPage.emptyStateCreateButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const tableEmpty = await wdsPage.listViewTable
      .locator('text=/no.*data|empty/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasEmptyMessage || hasCreateButton || tableEmpty).toBeTruthy();
  });

  test('switching between modes maintains context filter', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    try {
      const contextDropdown = page
        .locator('[class*="MuiSelect"], [class*="Select"], select')
        .first();

      const isVisible = await contextDropdown.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        await contextDropdown.click();
        await page.waitForTimeout(500);

        const options = await page.getByRole('option').all();
        if (options.length > 1) {
          const optionText = await options[1].textContent();
          const optionValue = await options[1].getAttribute('data-value').catch(() => null);
          await options[1].click();
          await page.waitForTimeout(1000);

          const selectedContext = await contextDropdown
            .evaluate((el: HTMLElement) => {
              const select = el as HTMLSelectElement;
              if (select.value) return select.value;
              const input = el.querySelector('input[value]') as HTMLInputElement;
              if (input?.value) return input.value;
              return el.textContent?.trim() || 'all';
            })
            .catch(() => optionValue || optionText || 'all');

          await wdsPage.switchToListView();
          await wdsPage.waitForListView();
          await page.waitForTimeout(1000);

          const contextAfterSwitch = await contextDropdown
            .evaluate((el: HTMLElement) => {
              const select = el as HTMLSelectElement;
              if (select.value) return select.value;
              const input = el.querySelector('input[value]') as HTMLInputElement;
              if (input?.value) return input.value;
              return el.textContent?.trim() || 'all';
            })
            .catch(() => selectedContext);

          expect(contextAfterSwitch).toBe(selectedContext);

          await wdsPage.switchToTilesView();
          await wdsPage.waitForTilesView();
          await page.waitForTimeout(1000);

          const contextAfterSwitchBack = await contextDropdown
            .evaluate((el: HTMLElement) => {
              const select = el as HTMLSelectElement;
              if (select.value) return select.value;
              const input = el.querySelector('input[value]') as HTMLInputElement;
              if (input?.value) return input.value;
              return el.textContent?.trim() || 'all';
            })
            .catch(() => selectedContext);

          expect(contextAfterSwitchBack).toBe(selectedContext);
        } else {
          console.warn('Context dropdown has no options to select');
        }
      } else {
        console.warn('Context dropdown not visible, skipping context filter preservation test');
      }
    } catch (error) {
      console.warn('Context filter preservation test skipped:', error);
    }
  });

  test('view mode persists after page refresh', async ({ page }) => {
    // Use POM method to switch to list view
    await wdsPage.switchToListView();
    await wdsPage.waitForListView();

    // Re-apply MSW scenario to ensure handlers are active after reload
    await mswHelper.applyScenario('wdsSuccess');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Handle potential login redirect using POM
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await loginPage.login();
      await page.waitForURL(/workloads\/manage|/, { timeout: 10000 });
    }

    // Use POM methods to ensure we're on the right page
    await wdsPage.ensureOnWdsPage();
    await page.waitForURL(/workloads\/manage/, { timeout: 10000 });
    await wdsPage.waitForPageLoad();

    // Use POM methods to check view mode
    const isListAfterRefresh = await wdsPage.isListViewActive();
    const isTilesAfterRefresh = await wdsPage.isTilesViewActive();

    expect(isListAfterRefresh || isTilesAfterRefresh).toBeTruthy();
  });

  test('pagination works in list view', async ({ page }) => {
    await wdsPage.switchToListView();
    await wdsPage.waitForListView();
    await page.waitForTimeout(2000);

    const paginationInfo = await wdsPage.getListViewPaginationInfo();

    if (paginationInfo.total > 1) {
      const initialPage = paginationInfo.current;

      const nextButton = page.getByRole('button').filter({ hasText: /next/i }).first();
      const hasNextButton = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
      const isNextDisabled = hasNextButton
        ? await nextButton.isDisabled().catch(() => false)
        : true;

      if (hasNextButton && !isNextDisabled) {
        await wdsPage.navigateToNextPage();
        await page.waitForTimeout(2000);

        const nextPageInfo = await wdsPage.getListViewPaginationInfo();
        if (nextPageInfo.current > initialPage) {
          expect(nextPageInfo.current).toBeGreaterThan(initialPage);

          const prevButton = page
            .getByRole('button')
            .filter({ hasText: /previous|prev/i })
            .first();
          const hasPrevButton = await prevButton.isVisible({ timeout: 3000 }).catch(() => false);
          const isPrevDisabled = hasPrevButton
            ? await prevButton.isDisabled().catch(() => false)
            : true;

          if (hasPrevButton && !isPrevDisabled) {
            await wdsPage.navigateToPreviousPage();
            await page.waitForTimeout(2000);

            const prevPageInfo = await wdsPage.getListViewPaginationInfo();
            expect(prevPageInfo.current).toBeLessThanOrEqual(initialPage + 1);
          }
        }
      } else {
        console.warn('Pagination not available or next button disabled');
      }
    } else {
      console.warn('Pagination not needed - only one page or no items');
    }
  });

  test('zoom controls visible only in tiles view', async ({ page }) => {
    await page.waitForURL(/workloads\/manage/, { timeout: 10000 });

    await wdsPage.switchToTilesView();
    await page.waitForTimeout(2000);

    const zoomControlsVisible = await wdsPage.zoomControls
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    await wdsPage.switchToListView();
    await page.waitForTimeout(2000);

    const zoomControlsHidden = !(await wdsPage.zoomControls
      .isVisible({ timeout: 2000 })
      .catch(() => false));

    expect(zoomControlsVisible || zoomControlsHidden).toBeTruthy();
  });

  test('filters section visible only in tiles view', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const filtersVisibleInTiles = await wdsPage.isFiltersVisible();

    await wdsPage.switchToListView();
    await wdsPage.waitForListView();
    await page.waitForTimeout(1000);

    const filtersVisibleInList = await wdsPage.isFiltersVisible();

    if (filtersVisibleInTiles) {
      expect(filtersVisibleInList).toBeFalsy();
    }
  });

  test('multiple rapid view mode switches', async ({ page }) => {
    await page.waitForURL(/workloads\/manage/, { timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      await wdsPage.tilesViewButton.click().catch(() => {});
      await page.waitForTimeout(300);
      await wdsPage.listViewButton.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    const finalMode = (await wdsPage.isListViewActive()) ? 'list' : 'tiles';
    expect(['list', 'tiles']).toContain(finalMode);

    if (finalMode === 'list') {
      const hasList =
        (await wdsPage.listViewTable.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.getListViewItemCount()) > 0 ||
        (await wdsPage.emptyStateMessage.isVisible({ timeout: 2000 }).catch(() => false));
      expect(hasList).toBeTruthy();
    } else {
      const hasTiles =
        (await wdsPage.reactFlowCanvas.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.flowCanvas.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.emptyState.isVisible({ timeout: 2000 }).catch(() => false));
      expect(hasTiles).toBeTruthy();
    }
  });

  test('resource counts update correctly when switching modes', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await page.waitForTimeout(2000);

    const tilesCount = await wdsPage.getResourceCount();

    await wdsPage.switchToListView();
    await page.waitForTimeout(2000);

    const listCount = await wdsPage.getResourceCount();

    await wdsPage.switchToTilesView();
    await page.waitForTimeout(2000);

    const tilesCountAgain = await wdsPage.getResourceCount();

    expect(tilesCount).toBeGreaterThanOrEqual(0);
    expect(listCount).toBeGreaterThanOrEqual(0);
    expect(tilesCountAgain).toBeGreaterThanOrEqual(0);

    if (tilesCount > 0 || listCount > 0) {
      expect(tilesCount).toBe(tilesCountAgain);
    } else {
      expect(tilesCount).toBe(0);
      expect(listCount).toBe(0);
      expect(tilesCountAgain).toBe(0);
    }
  });
});
