import { Page } from '@playwright/test';

export interface MockNamespaceData {
  name: string;
  status: string;
  labels: Record<string, string>;
  context: string;
  resources: Record<string, Array<Record<string, unknown>>>;
}

export interface WebSocketMockConfig {
  namespaceData?: MockNamespaceData[];
  endpoint?: string;
  delay?: number;
}

export class ReactFlowHelper {
  constructor(private page: Page) {}

  private async isPageOpen(): Promise<boolean> {
    try {
      const url = this.page.url();
      return !!url;
    } catch {
      return false;
    }
  }

  async injectNamespaceData(data: MockNamespaceData[]): Promise<void> {
    await this.page.evaluate(mockData => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__MOCK_NAMESPACE_DATA__ = mockData;
    }, data);
  }

  async setupWebSocketMock(config: WebSocketMockConfig = {}): Promise<void> {
    const { namespaceData, endpoint = '/ws/namespaces', delay = 150 } = config;
    const mockData = namespaceData || [];

    await this.page.addInitScript(
      ({
        endpointPattern,
        dataDelay,
        mockData: data,
      }: {
        endpointPattern: string;
        dataDelay: number;
        mockData: MockNamespaceData[];
      }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__MOCK_NAMESPACE_DATA__ = data;

        class MockWebSocket {
          url: string | URL;
          protocol: string;
          readyState: number;
          CONNECTING = 0;
          OPEN = 1;
          CLOSING = 2;
          CLOSED = 3;
          private _eventListeners: Map<string, Set<EventListener>> = new Map();
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;

          constructor(url: string | URL, protocols?: string | string[]) {
            this.url = url;
            this.protocol = Array.isArray(protocols) ? protocols.join(',') : protocols || '';
            this.readyState = this.CONNECTING;

            const urlString = typeof url === 'string' ? url : url.toString();
            const shouldMock =
              urlString.includes(endpointPattern) || urlString.endsWith(endpointPattern);

            setTimeout(() => {
              this.readyState = this.OPEN;
              const openEvent = new Event('open');
              if (this.onopen) {
                try {
                  this.onopen(openEvent);
                } catch (e) {
                  console.error('[MockWebSocket] Error in onopen:', e);
                }
              }

              this._eventListeners.get('open')?.forEach(listener => {
                try {
                  listener(openEvent);
                } catch (e) {
                  console.error('[MockWebSocket] Error in open listener:', e);
                }
              });

              if (shouldMock && data && data.length > 0) {
                const handlerSetupDelay = 150;
                setTimeout(() => {
                  if (this.readyState === this.OPEN) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const windowMockData = (window as any).__MOCK_NAMESPACE_DATA__;
                    const mockDataToSend: MockNamespaceData[] = windowMockData || data || [];

                    if (mockDataToSend.length > 0) {
                      try {
                        const dataString = JSON.stringify(mockDataToSend);
                        const messageEvent = new MessageEvent('message', {
                          data: dataString,
                        });

                        console.log(
                          '[MockWebSocket] Sending mock data for',
                          urlString,
                          ':',
                          dataString.substring(0, 200)
                        );

                        if (this.onmessage) {
                          try {
                            this.onmessage(messageEvent);
                          } catch (e) {
                            console.error('[MockWebSocket] Error in onmessage:', e);
                          }
                        }

                        this._eventListeners.get('message')?.forEach(listener => {
                          try {
                            listener(messageEvent);
                          } catch (e) {
                            console.error('[MockWebSocket] Error in message listener:', e);
                          }
                        });

                        console.log(
                          '[MockWebSocket] Successfully sent mock data:',
                          mockDataToSend.length,
                          'namespaces'
                        );
                      } catch (e) {
                        console.error('[MockWebSocket] Error sending data:', e);
                      }
                    } else {
                      console.warn('[MockWebSocket] No mock data to send for', urlString);
                    }
                  }
                }, handlerSetupDelay);
              } else if (shouldMock) {
                console.warn('[MockWebSocket] Should mock but no data provided for', urlString);
              }
            }, dataDelay);
          }

          addEventListener(type: string, listener: EventListener): void {
            if (!this._eventListeners.has(type)) {
              this._eventListeners.set(type, new Set());
            }
            this._eventListeners.get(type)?.add(listener);
          }

          removeEventListener(type: string, listener: EventListener): void {
            this._eventListeners.get(type)?.delete(listener);
          }

          send(): void {}

          close(): void {
            this.readyState = this.CLOSED;
            const closeEvent = new CloseEvent('close');
            if (this.onclose) {
              this.onclose(closeEvent);
            }
            this._eventListeners.get('close')?.forEach(listener => listener(closeEvent));
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).WebSocket = MockWebSocket;
      },
      { endpointPattern: endpoint, dataDelay: delay, mockData }
    );
  }

  async waitForReactFlow(timeout: number = 15000): Promise<void> {
    await this.page.waitForSelector('.react-flow, [class*="react-flow"]', {
      state: 'visible',
      timeout,
    });
  }

  async waitForReactFlowNodes(timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        () => {
          const reactFlow = document.querySelector('.react-flow');
          if (!reactFlow) return false;
          const nodes = reactFlow.querySelectorAll('[class*="node"]');
          return nodes.length > 0;
        },
        { timeout }
      );
      return true;
    } catch {
      return false;
    }
  }

  async ensureTilesView(): Promise<boolean> {
    await this.page.waitForTimeout(500);

    const hasReactFlow = await this.page
      .locator('.react-flow, [class*="react-flow"]')
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasReactFlow) {
      return true;
    }

    const viewButtons = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .map(btn => ({
          element: btn,
          text: btn.textContent || '',
          title: btn.getAttribute('title') || '',
          ariaLabel: btn.getAttribute('aria-label') || '',
        }))
        .filter(btn => {
          const searchText = `${btn.text} ${btn.title} ${btn.ariaLabel}`.toLowerCase();
          return /tiles?|grid|canvas|view/i.test(searchText);
        });
    });

    if (viewButtons.length > 0) {
      await this.page.evaluate((buttonIndex: number) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tilesButtons = buttons.filter(btn => {
          const text = (btn.textContent || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          return /tiles?|grid|canvas/.test(text) || /tiles?|grid|canvas/.test(title);
        });

        if (tilesButtons[buttonIndex]) {
          (tilesButtons[buttonIndex] as HTMLElement).click();
        }
      }, 0);

      await this.page.waitForTimeout(1000);

      return await this.page
        .locator('.react-flow, [class*="react-flow"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    }

    try {
      const isOpen = await this.isPageOpen();
      if (!isOpen) {
        return false;
      }
      await this.page.waitForTimeout(2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        return false;
      }
      throw error;
    }

    try {
      const isOpen = await this.isPageOpen();
      if (!isOpen) {
        return false;
      }
      return await this.page
        .locator('.react-flow, [class*="react-flow"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        return false;
      }
      throw error;
    }
  }

  async waitForZoomControls(browserName: string = 'chromium'): Promise<void> {
    await this.waitForReactFlow(8000);

    const zoomDisplay = this.page.locator('text=/\\d+%/').first();

    try {
      await zoomDisplay.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const controlAreaButtons = buttons.filter(btn => {
          const rect = btn.getBoundingClientRect();
          const hasSvg = btn.querySelector('svg');
          return hasSvg && rect.top < 250 && rect.left < 450 && rect.width > 0 && rect.height > 0;
        });

        if (controlAreaButtons.length > 0) {
          const toggleBtn =
            controlAreaButtons.length === 1
              ? controlAreaButtons[0]
              : controlAreaButtons.sort(
                  (a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left
                )[0];

          (toggleBtn as HTMLElement).click();
        }
      });

      await this.page.waitForTimeout(300);
      await zoomDisplay.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    }

    await this.page.waitForTimeout(
      browserName === 'webkit' ? 150 : browserName === 'chromium' ? 50 : 100
    );
  }

  async waitForReactFlowWithZoomControls(browserName: string = 'chromium'): Promise<void> {
    const isPageOpen = await this.isPageOpen();
    if (!isPageOpen) {
      throw new Error('Page was closed before ReactFlow initialization');
    }

    try {
      await this.page
        .waitForFunction(
          () => {
            const loading = document.querySelector('[class*="loading"], [class*="skeleton"]');
            const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
            const table = document.querySelector('table');
            const emptyState = document.querySelector('[class*="empty"], [class*="Empty"]');
            if (reactFlow) return true;
            if (table) return false;
            return !loading && !emptyState;
          },
          { timeout: 15000 }
        )
        .catch(() => {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        if (browserName === 'webkit') {
          await this.page.waitForTimeout(1000);
          const stillOpen = await this.isPageOpen();
          if (!stillOpen) {
            throw new Error('Page was closed during ReactFlow initialization (webkit)');
          }
          return;
        }
        throw new Error('Page was closed during ReactFlow initialization');
      }
      throw error;
    }

    try {
      if (browserName === 'webkit') {
        await this.page.waitForTimeout(500);
      } else if (browserName === 'chromium') {
        await this.page.waitForTimeout(800);
      } else {
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        if (browserName === 'webkit') {
          return;
        }
        throw new Error('Page was closed during ReactFlow initialization');
      }
      throw error;
    }

    const stillOpen = await this.isPageOpen();
    if (!stillOpen) {
      if (browserName === 'webkit') {
        return;
      }
      throw new Error('Page was closed before ensuring tiles view');
    }

    await this.ensureTilesView();

    const stillOpenBeforeWait = await this.isPageOpen();
    if (!stillOpenBeforeWait) {
      if (browserName === 'webkit') {
        return;
      }
      throw new Error('Page was closed before waiting for ReactFlow');
    }

    try {
      const timeout = browserName === 'chromium' ? 15000 : 25000;
      await this.waitForReactFlow(timeout);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        if (browserName === 'webkit') {
          return;
        }
        throw error;
      }

      const isStillOpen = await this.isPageOpen();
      if (!isStillOpen) {
        if (browserName === 'webkit') {
          return;
        }
        throw new Error('Page was closed during ReactFlow wait');
      }

      try {
        const diagnosticInfo = await this.page.evaluate(() => {
          const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
          const table = document.querySelector('table');
          const loading = document.querySelector('[class*="loading"], [class*="skeleton"]');
          const emptyState = document.querySelector('[class*="empty"], [class*="Empty"]');
          const bodyText = document.body.textContent || '';
          const hasError = bodyText.includes('error') || bodyText.includes('Error');
          const buttons = Array.from(document.querySelectorAll('button'));
          const viewButtons = buttons.filter(btn => {
            const text = (btn.textContent || '').toLowerCase();
            return /tiles?|list|view/i.test(text);
          });

          return {
            hasReactFlow: !!reactFlow,
            hasTable: !!table,
            hasLoading: !!loading,
            hasEmptyState: !!emptyState,
            viewButtonsCount: viewButtons.length,
            bodyTextLength: bodyText.length,
            hasError,
            url: window.location.href,
          };
        });

        throw new Error(
          `ReactFlow container did not appear within timeout. Diagnostic info: ${JSON.stringify(diagnosticInfo, null, 2)}. ` +
            `This may indicate WebSocket data was not received, data format was incorrect, or component is still loading.`
        );
      } catch (evalError) {
        const evalErrorMessage = evalError instanceof Error ? evalError.message : String(evalError);
        if (evalErrorMessage.includes('closed') || evalErrorMessage.includes('Target')) {
          if (browserName === 'webkit') {
            return;
          }
          throw new Error('Page was closed during diagnostic evaluation');
        }
        throw evalError;
      }
    }

    const stillOpenBeforeZoom = await this.isPageOpen();
    if (!stillOpenBeforeZoom) {
      if (browserName === 'webkit') {
        return;
      }
      throw new Error('Page was closed before waiting for zoom controls');
    }

    try {
      await this.waitForZoomControls(browserName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        (errorMessage.includes('closed') || errorMessage.includes('Target')) &&
        browserName === 'webkit'
      ) {
        return;
      }
      throw error;
    }

    try {
      if (browserName === 'webkit') {
        await this.page.waitForTimeout(500);
      } else if (browserName === 'chromium') {
        await this.page.waitForTimeout(400);
      } else {
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
        if (browserName === 'webkit') {
          return;
        }
        throw new Error('Page was closed during ReactFlow zoom controls initialization');
      }
      throw error;
    }
  }

  async getZoomLevel(): Promise<number> {
    const zoomDisplay = this.page.locator('text=/\\d+%/').first();
    const zoomText = await zoomDisplay.textContent();
    const match = zoomText?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 100;
  }

  async waitForWDSPage(browserName: string = 'chromium'): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
        const table = document.querySelector('table');
        const canvas = document.querySelector('canvas');
        const createBtn = Array.from(document.querySelectorAll('button')).some(b =>
          /create|add|new|workload/i.test(b.textContent || '')
        );
        return !!(reactFlow || table || canvas || createBtn);
      },
      { timeout: 15000 }
    );

    if (browserName === 'firefox') {
      await this.page.waitForTimeout(200);
    }
  }

  async waitForWECSPage(browserName: string = 'chromium'): Promise<void> {
    await this.waitForWDSPage(browserName);
  }

  static createDefaultNamespaceData(context: string = 'wds1'): MockNamespaceData[] {
    return [
      {
        name: 'test-namespace',
        status: 'Active',
        labels: { environment: 'test' },
        context,
        resources: {
          'v1/Service': [
            {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: {
                name: 'test-service',
                namespace: 'test-namespace',
                creationTimestamp: new Date().toISOString(),
                labels: { app: 'test' },
                uid: 'test-uid-1',
              },
              spec: {
                ports: [{ name: 'http', port: 80 }],
              },
              status: {
                conditions: [
                  {
                    type: 'Available',
                    status: 'True',
                  },
                ],
              },
            },
          ],
          'apps/v1/Deployment': [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              metadata: {
                name: 'test-deployment',
                namespace: 'test-namespace',
                creationTimestamp: new Date().toISOString(),
                labels: { app: 'test' },
                uid: 'test-uid-2',
              },
              spec: {
                replicas: 1,
              },
              status: {
                conditions: [
                  {
                    type: 'Available',
                    status: 'True',
                  },
                ],
              },
            },
          ],
        },
      },
    ];
  }

  static createRichNamespaceData(context: string = 'wds1'): MockNamespaceData[] {
    const now = new Date().toISOString();
    return [
      {
        name: 'default',
        status: 'Active',
        labels: { environment: 'production', team: 'backend' },
        context,
        resources: {
          'v1/Service': [
            {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: {
                name: 'api-service',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api', tier: 'backend' },
                uid: 'svc-uid-1',
              },
              spec: {
                ports: [
                  { name: 'http', port: 80 },
                  { name: 'https', port: 443 },
                ],
                selector: { app: 'api' },
              },
              status: { loadBalancer: {} },
            },
            {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: {
                name: 'db-service',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'database', tier: 'data' },
                uid: 'svc-uid-2',
              },
              spec: {
                ports: [{ name: 'postgres', port: 5432 }],
                selector: { app: 'database' },
              },
            },
          ],
          'apps/v1/Deployment': [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              metadata: {
                name: 'api-deployment',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api', tier: 'backend' },
                uid: 'deploy-uid-1',
              },
              spec: {
                replicas: 3,
                selector: { matchLabels: { app: 'api' } },
                template: {
                  metadata: { labels: { app: 'api' } },
                  spec: {
                    containers: [{ name: 'api', image: 'api:latest' }],
                  },
                },
              },
              status: {
                replicas: 3,
                readyReplicas: 3,
                availableReplicas: 3,
              },
            },
          ],
          'v1/Pod': [
            {
              apiVersion: 'v1',
              kind: 'Pod',
              metadata: {
                name: 'api-pod-1',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api', tier: 'backend' },
                uid: 'pod-uid-1',
              },
              spec: {
                containers: [{ name: 'api', image: 'api:latest' }],
              },
              status: {
                phase: 'Running',
                conditions: [{ type: 'Ready', status: 'True' }],
              },
            },
            {
              apiVersion: 'v1',
              kind: 'Pod',
              metadata: {
                name: 'api-pod-2',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api', tier: 'backend' },
                uid: 'pod-uid-2',
              },
              spec: {
                containers: [{ name: 'api', image: 'api:latest' }],
              },
              status: {
                phase: 'Running',
                conditions: [{ type: 'Ready', status: 'True' }],
              },
            },
          ],
          'v1/ConfigMap': [
            {
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: {
                name: 'api-config',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api' },
                uid: 'cm-uid-1',
              },
              data: { 'config.yaml': 'key: value' },
            },
          ],
          'v1/Secret': [
            {
              apiVersion: 'v1',
              kind: 'Secret',
              metadata: {
                name: 'api-secret',
                namespace: 'default',
                creationTimestamp: now,
                labels: { app: 'api' },
                uid: 'secret-uid-1',
              },
              type: 'Opaque',
              data: {},
            },
          ],
        },
      },
      {
        name: 'production',
        status: 'Active',
        labels: { environment: 'production', team: 'frontend' },
        context,
        resources: {
          'v1/Service': [
            {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: {
                name: 'web-service',
                namespace: 'production',
                creationTimestamp: now,
                labels: { app: 'web', tier: 'frontend' },
                uid: 'svc-uid-3',
              },
              spec: {
                ports: [{ name: 'http', port: 80 }],
                selector: { app: 'web' },
              },
            },
          ],
          'apps/v1/Deployment': [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              metadata: {
                name: 'web-deployment',
                namespace: 'production',
                creationTimestamp: now,
                labels: { app: 'web', tier: 'frontend' },
                uid: 'deploy-uid-2',
              },
              spec: {
                replicas: 2,
                selector: { matchLabels: { app: 'web' } },
                template: {
                  metadata: { labels: { app: 'web' } },
                  spec: {
                    containers: [{ name: 'web', image: 'web:latest' }],
                  },
                },
              },
              status: {
                replicas: 2,
                readyReplicas: 2,
                availableReplicas: 2,
              },
            },
          ],
        },
      },
    ];
  }
}
