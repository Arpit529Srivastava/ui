import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { MSWHelper } from './utils/MSWHelper';

export class ITSPage extends BasePage {
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly tableHeaders: Locator;
  readonly columnHeaders: Locator;
  readonly sortableHeaders: Locator;
  readonly sortIndicators: Locator;
  readonly paginationControls: Locator;
  readonly searchInput: Locator;
  readonly rowCheckboxes: Locator;
  readonly labelChips: Locator;
  readonly filterChips: Locator;
  readonly filterPanel: Locator;
  readonly bulkActionsButton: Locator;
  readonly actionButtons: Locator;
  readonly columnToggleButton: Locator;
  readonly columnOptions: Locator;
  readonly statusBadges: Locator;
  readonly contextMenu: Locator;
  readonly menuItems: Locator;
  readonly importButton: Locator;
  readonly dialog: Locator;
  readonly dialogTabs: Locator;
  readonly dialogButtons: Locator;
  readonly dialogInputs: Locator;
  readonly dialogTextAreas: Locator;
  readonly dialogFileInputs: Locator;
  readonly dialogCloseButtons: Locator;
  readonly dialogTitles: Locator;
  readonly loadingIndicators: Locator;
  readonly emptyState: Locator;
  readonly resizeHandles: Locator;
  readonly bulkSelectionSummary: Locator;
  readonly selectedFilterCount: Locator;
  readonly menuToggleCandidates: Locator;
  readonly successMessages: Locator;
  readonly errorMessages: Locator;
  readonly toastSuccess: Locator;
  readonly toastError: Locator;
  readonly notificationMessages: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.locator('table');
    this.tableRows = page.locator('tbody tr');
    this.tableHeaders = page.locator('thead th, thead td');
    this.columnHeaders = page.locator('th, [role="columnheader"]');
    this.sortableHeaders = page.locator(
      'thead th[role="button"], thead th[class*="sortable"], thead th button'
    );
    this.sortIndicators = page.locator('[class*="sort"], [aria-sort]');
    this.paginationControls = page.locator('[class*="pagination"], [role="navigation"]');
    this.searchInput = page.locator('input[type="text"]').first();
    this.rowCheckboxes = page.locator('tbody input[type="checkbox"]');
    this.labelChips = page.locator(
      '[class*="chip"], [class*="tag"], [class*="label"], [class*="badge"]'
    );
    this.filterChips = page.locator('[class*="filter-chip"], [class*="active-filter"]');
    this.filterPanel = page.getByTestId('filter-panel');
    this.bulkActionsButton = page.getByRole('button', { name: /Manage|Bulk/i }).first();
    this.actionButtons = page.locator('tbody tr button');
    this.columnToggleButton = page.getByRole('button', { name: /columns|view|show/i }).first();
    this.columnOptions = page.locator('[role="menuitem"], [type="checkbox"]');
    this.statusBadges = page
      .locator('[class*="badge"], [class*="status"], [role="status"], [data-status]')
      .filter({ hasText: /Active|Available|Ready|Running|Pending/i });
    this.contextMenu = page.locator('[role="menu"], [class*="context"], [class*="menu"]');
    this.menuItems = page.locator('[role="menuitem"]');
    this.importButton = page.getByRole('button', { name: /Import|Add|Connect/i }).first();
    this.dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
    this.dialogTabs = this.dialog.locator('[role="tab"]');
    this.dialogButtons = this.dialog.locator('button');
    this.dialogInputs = this.dialog.locator('input');
    this.dialogTextAreas = this.dialog.locator('textarea');
    this.dialogFileInputs = this.dialog.locator('input[type="file"]');
    this.dialogCloseButtons = this.dialog.locator(
      '[aria-label*="close" i], button:has-text("Close"), button:has-text("Cancel"), button[icon="close"]'
    );
    this.dialogTitles = this.dialog.locator('h1, h2, h3, [data-testid="dialog-title"]');
    this.loadingIndicators = page.locator(
      '[class*="loading"], [class*="spinner"], [role="status"]'
    );
    this.emptyState = page.locator('text=/no clusters|no results|empty/i').first();
    this.resizeHandles = page.locator('[class*="resize"], th[style*="resize"]');
    this.bulkSelectionSummary = page.locator('text=/selected/').first();
    this.selectedFilterCount = page
      .locator('[data-testid="filter-count"], text=/filtered/i')
      .first();
    this.menuToggleCandidates = page.locator(
      '[aria-label*="menu"], [data-testid*="menu"], button:has-text("..."), [class*="menu"] button, [class*="kebab"] button'
    );
    this.successMessages = page.locator('text=/success|updated|saved|applied|detached|connected/i');
    this.errorMessages = page.locator('text=/error|failed|invalid|required/i');
    this.toastSuccess = page
      .locator('.toast-success, [role="status"]')
      .filter({ hasText: /success|updated|saved/i });
    this.toastError = page.locator('.toast-error, [role="alert"]');
    this.notificationMessages = page.locator(
      '[data-testid="notification"], .toast, [role="status"], [role="alert"]'
    );
  }

  async goto() {
    await super.goto('/its');
  }

  async openWithScenario(msw: MSWHelper, scenarioName: string) {
    await msw.applyScenario(scenarioName);
    await this.goto();
    await this.waitForReady();
  }

  async applyScenario(msw: MSWHelper, scenarioName: string) {
    await msw.applyScenario(scenarioName);
  }

  async waitForReady(timeout: number = 15000) {
    await this.page.waitForLoadState('networkidle');
    await expect(this.table.first()).toBeVisible({ timeout });
  }

  async reload() {
    await this.page.reload();
    await this.waitForReady();
  }

  async search(value: string, debounceMs: number = 500) {
    await this.searchInput.fill(value);
    if (debounceMs > 0) {
      await this.page.waitForTimeout(debounceMs);
    }
  }

  async clearSearch(debounceMs: number = 200) {
    await this.searchInput.clear();
    if (debounceMs > 0) {
      await this.page.waitForTimeout(debounceMs);
    }
  }

  async openImportDialog() {
    await this.importButton.click();
    await this.waitForDialog();
  }

  clusterRow(clusterName: string): Locator {
    return this.tableRows.filter({ hasText: clusterName }).first();
  }

  actionButtonForCluster(clusterName: string): Locator {
    return this.clusterRow(clusterName).locator('button').first();
  }

  async openActionsMenu(clusterName: string) {
    const button = this.actionButtonForCluster(clusterName);
    await button.click();
    await expect(this.contextMenu.first()).toBeVisible();
  }

  async selectRowByIndex(index: number) {
    const checkbox = this.rowCheckboxes.nth(index);
    await checkbox.check();
  }

  async toggleRowSelectionByIndex(index: number) {
    const checkbox = this.rowCheckboxes.nth(index);
    const state = await checkbox.isChecked();
    if (state) {
      await checkbox.uncheck();
    } else {
      await checkbox.check();
    }
  }

  async selectFirstRows(count: number) {
    for (let i = 0; i < count; i++) {
      await this.selectRowByIndex(i);
    }
  }

  async openBulkActions() {
    await this.bulkActionsButton.click();
    await expect(this.contextMenu.first()).toBeVisible();
  }

  labelChip(text: string): Locator {
    return this.labelChips.filter({ hasText: ITSPage.toRegex(text) }).first();
  }

  async clickLabelChip(text: string) {
    await this.labelChip(text).click();
  }

  filterChip(text: string): Locator {
    return this.filterChips.filter({ hasText: ITSPage.toRegex(text) }).first();
  }

  menuItem(text: string | RegExp): Locator {
    if (typeof text === 'string') {
      return this.menuItems.filter({ hasText: ITSPage.toRegex(text) }).first();
    }
    return this.menuItems.filter({ hasText: text }).first();
  }

  dialogTab(name: string | RegExp): Locator {
    if (typeof name === 'string') {
      return this.dialogTabs.filter({ hasText: ITSPage.toRegex(name) }).first();
    }
    return this.dialogTabs.filter({ hasText: name }).first();
  }

  dialogButton(text: string | RegExp): Locator {
    if (typeof text === 'string') {
      return this.dialogButtons.filter({ hasText: ITSPage.toRegex(text) }).first();
    }
    return this.dialogButtons.filter({ hasText: text }).first();
  }

  dialogInput(partial: string): Locator {
    const selector = `input[placeholder*="${partial}"]`;
    return this.dialog.locator(`${selector}, input[name*="${partial}"]`).first();
  }

  dialogInputsByPartial(partial: string): Locator {
    const selector = `input[placeholder*="${partial}"]`;
    return this.dialog.locator(`${selector}, input[name*="${partial}"]`);
  }

  dialogTextarea(): Locator {
    return this.dialogTextAreas.first();
  }

  dialogTextareaByIndex(index: number): Locator {
    return this.dialogTextAreas.nth(index);
  }

  dialogText(text: string | RegExp): Locator {
    if (typeof text === 'string') {
      return this.dialog.locator(`text=${text}`);
    }
    return this.dialog.locator('text=/./').filter({ hasText: text });
  }

  async dialogTabsCount(): Promise<number> {
    return this.dialogTabs.count();
  }

  async selectDialogTab(name: string | RegExp) {
    const tab = this.dialogTab(name);
    if (await tab.isVisible()) {
      await tab.click();
    }
  }

  async fillDialogInput(partial: string, value: string) {
    const input = this.dialogInput(partial);
    if (await input.isVisible()) {
      await input.fill(value);
    }
  }

  async fillDialogTextarea(value: string, index: number = 0) {
    const textarea = index === 0 ? this.dialogTextarea() : this.dialogTextareaByIndex(index);
    if (await textarea.isVisible()) {
      await textarea.fill(value);
    }
  }

  buttonByName(name: string | RegExp): Locator {
    if (typeof name === 'string') {
      return this.page.getByRole('button', { name: ITSPage.toRegex(name) }).first();
    }
    return this.page.getByRole('button', { name }).first();
  }

  async openActionsMenuItem(clusterName: string, itemText: string | RegExp) {
    await this.openActionsMenu(clusterName);
    await this.menuItem(itemText).click();
  }

  async waitForDialog(timeout: number = 5000) {
    await expect(this.dialog).toBeVisible({ timeout });
  }

  async closeDialogViaEsc() {
    await this.page.keyboard.press('Escape');
  }

  async closeDialogViaButton() {
    if (await this.dialogCloseButtons.first().isVisible()) {
      await this.dialogCloseButtons.first().click();
    } else {
      await this.closeDialogViaEsc();
    }
  }

  async fillDialogField(partial: string, value: string) {
    const field = this.dialogInput(partial);
    await field.fill(value);
  }

  async clickDialogPrimaryButton() {
    const button = this.dialogButtons
      .filter({ hasText: /Apply|Save|Update|Confirm|Import|Connect|Add|Generate/i })
      .first();
    await button.click();
  }

  async expectSuccessMessage(timeout: number = 5000) {
    await expect(this.successMessages.first()).toBeVisible({ timeout });
  }

  async expectErrorMessage(timeout: number = 5000) {
    await expect(this.errorMessages.first()).toBeVisible({ timeout });
  }

  async clickLabelChipByText(text: string) {
    await this.clickLabelChip(text);
  }

  async applyFilterChipRemoval() {
    const filterChip = this.filterChips.first();
    if (await filterChip.isVisible()) {
      const removeButton = filterChip
        .locator('button, [class*="remove"], [class*="close"]')
        .first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
      }
    }
  }

  private static toRegex(text: string): RegExp {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i');
  }
}
