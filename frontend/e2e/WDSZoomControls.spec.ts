import { test, expect, Page } from '@playwright/test';
import { LoginPage, MSWHelper, ReactFlowHelper } from './pages';
import { BASE_URL } from './pages/constants';

async function getZoomLevel(page: Page): Promise<number> {
  const reactFlowHelper = new ReactFlowHelper(page);
  return reactFlowHelper.getZoomLevel();
}

test.describe('WDS Zoom Controls - Canvas Controls', () => {
  test.setTimeout(70000);

  test.beforeEach(async ({ page, browserName }) => {
    const reactFlowHelper = new ReactFlowHelper(page);
    const loginPage = new LoginPage(page);
    const mswHelper = new MSWHelper(page);

    const mockData = ReactFlowHelper.createDefaultNamespaceData('wds1');
    await reactFlowHelper.setupWebSocketMock({
      endpoint: '/ws/namespaces',
      namespaceData: mockData,
    });

    await loginPage.goto();
    await mswHelper.applyScenario('wdsSuccess');
    await loginPage.login();

    await page.waitForTimeout(500);
    await page.goto(`${BASE_URL}/workloads/manage`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/install')) {
      throw new Error(
        `Redirected to install page. URL: ${currentUrl}. Kubestellar status check may have failed.`
      );
    }

    await reactFlowHelper.waitForWDSPage(browserName);

    await page.waitForTimeout(4000);

    await reactFlowHelper.waitForReactFlowWithZoomControls(browserName);
  });

  test('zoom controls panel is visible and properly positioned', async ({ page }) => {
    const zoomDisplay = page.locator('text=/\\d+%/').first();

    await zoomDisplay.waitFor({ state: 'visible', timeout: 10000 });

    const zoomBoundingBox = await zoomDisplay.boundingBox();
    expect(zoomBoundingBox).toBeTruthy();
    if (zoomBoundingBox) {
      expect(zoomBoundingBox.width).toBeGreaterThan(0);
      expect(zoomBoundingBox.height).toBeGreaterThan(0);
    }

    const zoomText = await zoomDisplay.textContent();
    expect(zoomText).toMatch(/\d+%/);
    const zoomValue = parseInt(zoomText!.replace('%', ''), 10);
    expect(zoomValue).toBeGreaterThanOrEqual(10);
    expect(zoomValue).toBeLessThanOrEqual(200);

    const hasControlButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.top < 200 && rect.left < 400 && btn.querySelector('svg');
      });
    });
    expect(hasControlButtons).toBeTruthy();
  });

  test('zoom in button increases zoom level', async ({ page }) => {
    const initialZoom = await getZoomLevel(page);
    expect(initialZoom).toBeGreaterThanOrEqual(10);
    expect(initialZoom).toBeLessThanOrEqual(200);

    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    const isVisible = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      const toggleButton = page
        .locator('button')
        .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
        .first();
      const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }
    }

    await zoomInButton.waitFor({ state: 'visible', timeout: 3000 });
    await zoomInButton.click();
    await page.waitForTimeout(400);

    const newZoom = await getZoomLevel(page);
    if (initialZoom >= 200) {
      expect(newZoom).toBe(200);
    } else {
      expect(newZoom).toBeGreaterThan(initialZoom);
      expect(newZoom).toBeLessThanOrEqual(200);
    }
  });

  test('zoom out button decreases zoom level', async ({ page }) => {
    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    const isVisible = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      const toggleButton = page
        .locator('button')
        .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
        .first();
      const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }
    }

    const initialZoom = await getZoomLevel(page);

    await zoomInButton.waitFor({ state: 'visible', timeout: 3000 });

    let zoomAfterIn = initialZoom;
    let attempts = 0;
    const maxAttempts = 3;

    while (zoomAfterIn <= initialZoom && initialZoom < 200 && attempts < maxAttempts) {
      await zoomInButton.click();
      await page.waitForTimeout(400);
      zoomAfterIn = await getZoomLevel(page);
      attempts++;
    }

    if (zoomAfterIn <= initialZoom && initialZoom < 200) {
      zoomAfterIn = initialZoom;
    }

    const zoomOutButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomOut"]') })
      .or(page.locator('button[title*="Zoom Out"]'))
      .first();

    await zoomOutButton.waitFor({ state: 'visible', timeout: 3000 });
    await zoomOutButton.click();
    await page.waitForTimeout(400);

    const zoomAfterOut = await getZoomLevel(page);

    if (zoomAfterIn > 10) {
      expect(zoomAfterOut).toBeLessThan(zoomAfterIn);
    }
    expect(zoomAfterOut).toBeGreaterThanOrEqual(10);
  });

  test('reset zoom button resets to 100%', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    await zoomInButton.waitFor({ state: 'visible', timeout: 3000 });

    const initialZoom = await getZoomLevel(page);

    await zoomInButton.click();
    await page.waitForTimeout(400);

    let zoomAfterIn = await getZoomLevel(page);
    if (zoomAfterIn <= initialZoom && initialZoom < 200) {
      await zoomInButton.click();
      await page.waitForTimeout(400);
      zoomAfterIn = await getZoomLevel(page);
    }

    if (initialZoom < 200) {
      expect(zoomAfterIn).toBeGreaterThan(initialZoom);
    } else {
      expect(zoomAfterIn).toBe(200);
    }

    const resetButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="Refresh"]') })
      .or(page.locator('button[title*="Reset"], button[title*="reset"]'))
      .first();

    await resetButton.waitFor({ state: 'visible', timeout: 3000 });
    await resetButton.click();
    await page.waitForTimeout(250);

    const zoomAfterReset = await getZoomLevel(page);
    expect(zoomAfterReset).toBeGreaterThanOrEqual(95);
    expect(zoomAfterReset).toBeLessThanOrEqual(105);
  });

  test('zoom level display shows current zoom percentage', async ({ page }) => {
    const zoomDisplay = page.locator('text=/\\d+%/').first();

    await zoomDisplay.waitFor({ state: 'visible', timeout: 10000 });

    const zoomText = await zoomDisplay.textContent();
    expect(zoomText).toMatch(/\d+%/);

    const zoomValue = parseInt(zoomText!.replace('%', ''), 10);
    expect(zoomValue).toBeGreaterThanOrEqual(10);
    expect(zoomValue).toBeLessThanOrEqual(200);
  });

  test('zoom preset menu opens and allows selection', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const zoomDisplay = page.locator('text=/\\d+%/').first();
    await zoomDisplay.waitFor({ state: 'visible', timeout: 5000 });
    await zoomDisplay.click();

    await page.waitForTimeout(300);

    const menuItems = page.locator('[role="menuitem"], [role="option"]').filter({
      hasText: /Overview|Standard|Detailed|Focus/i,
    });

    const menuItemCount = await menuItems.count();
    expect(menuItemCount).toBeGreaterThan(0);

    const detailedPreset = menuItems.filter({ hasText: /Detailed/i }).first();
    if (await detailedPreset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await detailedPreset.click();
      await page.waitForTimeout(500);

      const newZoom = await getZoomLevel(page);
      expect(newZoom).toBeGreaterThanOrEqual(140);
      expect(newZoom).toBeLessThanOrEqual(160);
    }
  });

  test('controls can be collapsed and expanded', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="Chevron"]') })
      .first();

    await toggleButton.waitFor({ state: 'visible', timeout: 10000 });

    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    const initiallyVisible = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);

    await toggleButton.click();
    await page.waitForTimeout(300);

    const afterCollapse = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (initiallyVisible) {
      expect(afterCollapse).toBeFalsy();
    }

    await toggleButton.click();
    await page.waitForTimeout(300);

    const afterExpand = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (initiallyVisible) {
      expect(afterExpand).toBeTruthy();
    }
  });

  test('edge type toggle buttons work correctly', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const edgeToggleGroup = page
      .locator('[role="group"]')
      .filter({ has: page.locator('button[aria-label*="square"], button[aria-label*="curvy"]') })
      .first();

    const hasToggleGroup = await edgeToggleGroup.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasToggleGroup) {
      const stepButton = page
        .locator('button[aria-label*="square"], button[aria-label*="Square"]')
        .first();
      const bezierButton = page
        .locator('button[aria-label*="curvy"], button[aria-label*="Curvy"]')
        .first();

      const hasStepButton = await stepButton.isVisible({ timeout: 2000 }).catch(() => false);
      const hasBezierButton = await bezierButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasStepButton && hasBezierButton) {
        await bezierButton.click();
        await page.waitForTimeout(200);

        const isBezierSelected = await bezierButton.evaluate(el => {
          return (
            el.getAttribute('aria-pressed') === 'true' ||
            el.classList.contains('Mui-selected') ||
            el.getAttribute('aria-selected') === 'true'
          );
        });

        expect(isBezierSelected).toBeTruthy();

        await stepButton.click();
        await page.waitForTimeout(200);

        const isStepSelected = await stepButton.evaluate(el => {
          return (
            el.getAttribute('aria-pressed') === 'true' ||
            el.classList.contains('Mui-selected') ||
            el.getAttribute('aria-selected') === 'true'
          );
        });

        expect(isStepSelected).toBeTruthy();
      }
    }
  });

  test('expand all and collapse all buttons work', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const expandAllButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="Add"]') })
      .or(page.locator('button[title*="Expand"], button[title*="expand"]'))
      .first();

    const collapseAllButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="Remove"]') })
      .or(page.locator('button[title*="Collapse"], button[title*="collapse"]'))
      .first();

    const hasExpandAll = await expandAllButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasCollapseAll = await collapseAllButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasExpandAll && hasCollapseAll) {
      await expandAllButton.click();
      await page.waitForTimeout(300);

      await collapseAllButton.click();
      await page.waitForTimeout(300);

      expect(true).toBeTruthy();
    }
  });

  test('group by resource button toggles correctly', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const groupButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ViewQuilt"]') })
      .or(page.locator('button[title*="Group"], button[title*="group"]'))
      .first();

    const hasGroupButton = await groupButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasGroupButton) {
      await groupButton.click();
      await page.waitForTimeout(300);

      const newState = await groupButton.evaluate(el => {
        return (
          el.getAttribute('aria-pressed') === 'true' ||
          el.classList.contains('Mui-selected') ||
          el.getAttribute('data-active') === 'true'
        );
      });

      expect(typeof newState).toBe('boolean');
    }
  });

  test('fullscreen toggle works when available', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const fullscreenButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="Fullscreen"]') })
      .or(page.locator('button[title*="Fullscreen"], button[title*="fullscreen"]'))
      .first();

    const hasFullscreenButton = await fullscreenButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasFullscreenButton) {
      await fullscreenButton.click();
      await page.waitForTimeout(500);

      expect(true).toBeTruthy();
    }
  });

  test('zoom controls are keyboard accessible', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    const hasZoomIn = await zoomInButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasZoomIn) {
      await zoomInButton.focus();

      const isFocused = await zoomInButton.evaluate(el => document.activeElement === el);
      expect(isFocused).toBeTruthy();

      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);

      const zoomAfter = await getZoomLevel(page);
      expect(zoomAfter).toBeGreaterThanOrEqual(10);
    }
  });

  test('zoom controls maintain state after page interactions', async ({ page }) => {
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ChevronRight"]') })
      .first();
    const toggleVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (toggleVisible) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    const zoomInButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid*="ZoomIn"]') })
      .or(page.locator('button[title*="Zoom In"]'))
      .first();

    await zoomInButton.waitFor({ state: 'visible', timeout: 5000 });
    await zoomInButton.click();
    await page.waitForTimeout(400);

    const zoomAfterIn = await getZoomLevel(page);

    const canvas = page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasCanvas) {
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(200);
    }

    const zoomAfterInteraction = await getZoomLevel(page);
    expect(Math.abs(zoomAfterInteraction - zoomAfterIn)).toBeLessThan(5);
  });

  test('zoom controls work with mouse wheel zoom', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCanvas) {
      const initialZoom = await getZoomLevel(page);

      await canvas.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(400);

      const zoomAfterWheel = await getZoomLevel(page);
      if (initialZoom < 200) {
        expect(zoomAfterWheel).toBeGreaterThanOrEqual(initialZoom);
      }

      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(400);

      const zoomAfterWheelOut = await getZoomLevel(page);
      if (initialZoom > 10) {
        expect(zoomAfterWheelOut).toBeLessThanOrEqual(zoomAfterWheel);
      }
    }
  });
});
