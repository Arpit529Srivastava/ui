import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';

type DetailsTab = 'summary' | 'edit' | 'logs' | 'exec';

export class WecsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly noteBanner: Locator;
  readonly createWorkloadButton: Locator;
  readonly createOptionsDialog: Locator;
  readonly createOptionsTabs: Locator;
  readonly createOptionsCancelButton: Locator;
  readonly tilesViewButton: Locator;
  readonly listViewButton: Locator;
  readonly viewSkeleton: Locator;
  readonly listViewSkeleton: Locator;
  readonly reactFlowCanvas: Locator;
  readonly reactFlowNodes: Locator;
  readonly listViewContainer: Locator;
  readonly listViewItems: Locator;
  readonly listViewTableRows: Locator;
  readonly listViewSearchInput: Locator;
  readonly filterKindButton: Locator;
  readonly filterNamespaceButton: Locator;
  readonly filterLabelButton: Locator;
  readonly filterClearButton: Locator;
  readonly zoomControlsContainer: Locator;
  readonly zoomHideControlsButton: Locator;
  readonly zoomExpandAllButton: Locator;
  readonly zoomCollapseAllButton: Locator;
  readonly zoomFullscreenButton: Locator;
  readonly zoomEdgeSquareButton: Locator;
  readonly zoomEdgeCurvyButton: Locator;
  readonly contextMenu: Locator;
  readonly detailsPanel: Locator;
  readonly detailsPanelCloseButton: Locator;
  readonly summaryTab: Locator;
  readonly editTab: Locator;
  readonly logsTab: Locator;
  readonly execTab: Locator;
  readonly manifestEditor: Locator;
  readonly manifestFormatYamlButton: Locator;
  readonly manifestFormatJsonButton: Locator;
  readonly logsContainerDropdown: Locator;
  readonly logsPreviousButton: Locator;
  readonly logsDownloadButton: Locator;
  readonly logsTerminal: Locator;
  readonly execContainerDropdown: Locator;
  readonly execClearButton: Locator;
  readonly execMaximizeButton: Locator;
  readonly execTerminal: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.getByRole('heading', { name: /remote-?cluster treeview/i }).first();
    this.noteBanner = page
      .locator(
        'text=Note: Default, Kubernetes system, and OpenShift namespaces are filtered out from this view.'
      )
      .first();
    this.createWorkloadButton = page.getByRole('button', { name: /create workload/i }).first();
    this.createOptionsDialog = page.getByRole('dialog', { name: /create/i }).first();
    this.createOptionsTabs = this.createOptionsDialog.getByRole('tablist');
    this.createOptionsCancelButton = page.getByRole('button', { name: /cancel|close/i }).first();

    this.tilesViewButton = page
      .locator('button')
      .filter({ has: page.locator('i.fa-th, i.fa-solid.fa-th') })
      .first();
    this.listViewButton = page
      .locator('button')
      .filter({ has: page.locator('i.fa-th-list, i.fa-solid.fa-th-list') })
      .first();

    this.viewSkeleton = page
      .locator('[class*="UnifiedSkeleton"], [class*="unified-skeleton"]')
      .first();
    this.listViewSkeleton = page.locator('[class*="ListViewSkeleton"]').first();

    this.reactFlowCanvas = page.locator('.react-flow, [class*="react-flow"]').first();
    this.reactFlowNodes = this.reactFlowCanvas.locator('.react-flow__node, [data-id]');

    this.listViewContainer = page
      .locator('[class*="ListViewComponent"], [data-testid="list-view"]')
      .first();
    this.listViewItems = this.listViewContainer.locator('[class*="list-item"], [role="row"]');
    this.listViewTableRows = page.locator('table tbody tr');
    this.listViewSearchInput = page.getByRole('textbox', { name: /quick search objects/i }).first();
    this.filterKindButton = page.getByRole('button', { name: /kind/i }).first();
    this.filterNamespaceButton = page.getByRole('button', { name: /namespace/i }).first();
    this.filterLabelButton = page.getByRole('button', { name: /label/i }).first();
    this.filterClearButton = page.getByRole('button', { name: /clear filters|reset/i }).first();

    this.zoomControlsContainer = page.locator('text=/hide controls|show controls/i').first();
    this.zoomHideControlsButton = page
      .getByRole('button', { name: /hide controls|show controls/i })
      .first();
    this.zoomExpandAllButton = page.getByRole('button', { name: /expand all/i }).first();
    this.zoomCollapseAllButton = page.getByRole('button', { name: /collapse all/i }).first();
    this.zoomFullscreenButton = page
      .getByRole('button', { name: /fullscreen|exit fullscreen/i })
      .first();
    this.zoomEdgeSquareButton = page.getByRole('button', { name: /square/i }).first();
    this.zoomEdgeCurvyButton = page.getByRole('button', { name: /curvy/i }).first();

    this.contextMenu = page.locator('[role="menu"]').first();

    this.detailsPanel = page.locator('[data-testid="wecs-details-panel"]').first();
    this.detailsPanelCloseButton = this.detailsPanel
      .getByRole('button', { name: /close/i })
      .first();
    this.summaryTab = this.detailsPanel.getByRole('tab', { name: /summary/i }).first();
    this.editTab = this.detailsPanel.getByRole('tab', { name: /edit/i }).first();
    this.logsTab = this.detailsPanel.getByRole('tab', { name: /logs/i }).first();
    this.execTab = this.detailsPanel.getByRole('tab', { name: /exec/i }).first();
    this.manifestEditor = this.detailsPanel.locator('.monaco-editor, textarea, pre').first();
    this.manifestFormatYamlButton = this.detailsPanel
      .getByRole('button', { name: /yaml/i })
      .first();
    this.manifestFormatJsonButton = this.detailsPanel
      .getByRole('button', { name: /json/i })
      .first();

    this.logsContainerDropdown = this.detailsPanel.locator('.logs-container-dropdown').first();
    this.logsPreviousButton = this.detailsPanel
      .getByRole('button', { name: /previous logs/i })
      .first();
    this.logsDownloadButton = this.detailsPanel
      .locator('button[title*="Download logs"], button[title*="download"]')
      .first();
    this.logsTerminal = this.detailsPanel
      .locator('.xterm, .terminal, [data-testid="logs-terminal"]')
      .first();

    this.execContainerDropdown = this.detailsPanel.locator('.container-dropdown').first();
    this.execClearButton = this.detailsPanel
      .getByRole('button', { name: /clear terminal/i })
      .first();
    this.execMaximizeButton = this.detailsPanel
      .getByRole('button', { name: /maximize|minimize/i })
      .first();
    this.execTerminal = this.detailsPanel.locator('[data-terminal="exec"], .xterm').first();

    this.snackbar = page.locator('.MuiSnackbar-root, .toast, [role="alert"]').first();
  }

  async goto() {
    await super.goto('/wecs/treeview');
    await this.waitForInitialLoad();
  }

  async ensureOnWecsPage() {
    const url = this.page.url();
    if (!/\/wecs\/treeview/.test(url)) {
      await this.page.goto(`${this.BASE_URL}/wecs/treeview`, { waitUntil: 'domcontentloaded' });
    }
    await this.waitForInitialLoad();
  }

  async waitForInitialLoad() {
    await this.page.waitForFunction(
      () => {
        const heading = Array.from(document.querySelectorAll('h1,h2,h3,h4')).some(el =>
          /remote-?cluster treeview/i.test(el.textContent || '')
        );
        if (!heading) return false;
        const hasSkeleton = document.querySelector('[class*="Skeleton"]');
        const hasFlow = document.querySelector('.react-flow, [class*="react-flow"]');
        const hasList = document.querySelector('[class*="ListViewComponent"]');
        const bodyText = document.body?.innerText || '';
        const hasEmpty = /No Workloads Found/i.test(bodyText);
        return Boolean(hasSkeleton || hasFlow || hasList || hasEmpty);
      },
      { timeout: 30000 }
    );
  }

  async waitForTilesView() {
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector('.react-flow, [class*="react-flow"], canvas');
        const emptyState = /No Workloads Found/i.test(document.body?.innerText || '');
        const listView = document.querySelector('[class*="ListViewComponent"]');
        return Boolean(canvas || emptyState) && !listView;
      },
      { timeout: 20000 }
    );
  }

  async waitForListView() {
    await this.page.waitForFunction(
      () => {
        const listView = document.querySelector('[class*="ListViewComponent"]');
        const table = document.querySelector('table');
        const empty = /No Workloads Found/i.test(document.body?.innerText || '');
        return Boolean(listView || table || empty);
      },
      { timeout: 20000 }
    );
  }

  async switchToTilesView() {
    await this.tilesViewButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.tilesViewButton.click();
    await this.waitForTilesView();
  }

  async switchToListView() {
    await this.listViewButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.listViewButton.click();
    await this.waitForListView();
  }

  async openCreateOptions(option: string = 'yaml') {
    await this.createWorkloadButton.click();
    await expect(this.createOptionsDialog).toBeVisible({ timeout: 5000 });
    const tabLabelMap: Record<string, RegExp> = {
      yaml: /yaml/i,
      file: /file/i,
      github: /github/i,
      helm: /helm/i,
      artifactHub: /artifact hub/i,
    };
    const tab = this.createOptionsDialog
      .getByRole('tab', { name: tabLabelMap[option] || /yaml/i })
      .first();
    await tab.click();
  }

  async closeCreateOptions() {
    if (await this.createOptionsDialog.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      if (await this.createOptionsDialog.isVisible().catch(() => false)) {
        await this.createOptionsCancelButton.click().catch(() => {});
      }
      await this.createOptionsDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  async searchListView(query: string) {
    await this.listViewSearchInput.fill('');
    await this.listViewSearchInput.fill(query);
    await this.page.waitForTimeout(400);
  }

  async selectFilter(filter: 'kind' | 'namespace' | 'label', value: string) {
    const target =
      filter === 'kind'
        ? this.filterKindButton
        : filter === 'namespace'
          ? this.filterNamespaceButton
          : this.filterLabelButton;
    await target.click();
    const option = this.page.getByRole('menuitem', { name: new RegExp(value, 'i') }).first();
    await option.click();
    await this.page.waitForTimeout(300);
  }

  async clearFilters() {
    await this.filterClearButton.click().catch(() => {});
    await this.page.waitForTimeout(300);
  }

  getNodeLocator(nodeName: string) {
    return this.reactFlowNodes.filter({ hasText: new RegExp(nodeName, 'i') }).first();
  }

  async openNodeMenu(nodeName: string) {
    const node = this.getNodeLocator(nodeName);
    await node.waitFor({ state: 'visible', timeout: 10000 });
    const menuButton = node.getByRole('button', { name: /more options/i }).first();
    await menuButton.click();
    await this.contextMenu.waitFor({ state: 'visible', timeout: 5000 });
  }

  async selectContextMenuAction(action: 'details' | 'edit' | 'logs' | 'exec') {
    const labels: Record<typeof action, RegExp> = {
      details: /details/i,
      edit: /edit/i,
      logs: /logs/i,
      exec: /exec/i,
    };
    const item = this.page.getByRole('menuitem', { name: labels[action] }).first();
    await item.click();
  }

  async selectNode(nodeName: string) {
    const node = this.getNodeLocator(nodeName);
    await node.click();
    await this.page.waitForTimeout(300);
  }

  async waitForDetailsPanel() {
    await this.detailsPanel.waitFor({ state: 'visible', timeout: 10000 });
  }

  async closeDetailsPanel() {
    if (await this.detailsPanel.isVisible().catch(() => false)) {
      await this.detailsPanelCloseButton.click().catch(() => {});
      await this.detailsPanel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  async openDetailsTab(tab: DetailsTab) {
    const tabMap: Record<DetailsTab, Locator> = {
      summary: this.summaryTab,
      edit: this.editTab,
      logs: this.logsTab,
      exec: this.execTab,
    };
    await tabMap[tab].click();
    await this.page.waitForTimeout(300);
  }

  async setManifestFormat(format: 'yaml' | 'json') {
    if (format === 'yaml') {
      await this.manifestFormatYamlButton.click();
    } else {
      await this.manifestFormatJsonButton.click();
    }
    await this.page.waitForTimeout(200);
  }

  async selectLogsContainer(containerName: string) {
    await this.logsContainerDropdown.click();
    const option = this.page.getByRole('option', { name: new RegExp(containerName, 'i') }).first();
    await option.click();
    await this.page.waitForTimeout(200);
  }

  async togglePreviousLogs() {
    await this.logsPreviousButton.click();
    await this.page.waitForTimeout(300);
  }

  async selectExecContainer(containerName: string) {
    await this.execContainerDropdown.click();
    const option = this.page.getByRole('option', { name: new RegExp(containerName, 'i') }).first();
    await option.click();
    await this.page.waitForTimeout(200);
  }

  async clearExecTerminal() {
    await this.execClearButton.click();
    await this.page.waitForTimeout(200);
  }

  async toggleExecMaximize() {
    await this.execMaximizeButton.click();
    await this.page.waitForTimeout(300);
  }

  async waitForSnackbar(message?: RegExp) {
    await this.snackbar.waitFor({ state: 'visible', timeout: 10000 });
    if (message) {
      await expect(this.snackbar).toHaveText(message);
    }
  }
}
