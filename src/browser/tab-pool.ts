import puppeteer, { Browser, Page } from "puppeteer";
import { logger } from "../config/logger.js";
import { dockerConfig, npxConfig, DEFAULT_NAVIGATION_TIMEOUT } from "../config/browser.js";
import { TabInfo, TabPoolConfig, PoolStatus } from "../types/tab.js";

export class TabPool {
  private browser: Browser | null = null;
  private tabs: Map<string, TabInfo> = new Map();
  private config: TabPoolConfig = {
    tabCount: 5,
    headless: false,
    idleTimeout: 300000, // 5분
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async initialize(config: Partial<TabPoolConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // 브라우저 설정 결정
    const isDocker = process.env.DOCKER_CONTAINER === 'true';
    const baseConfig = isDocker ? dockerConfig : npxConfig;
    const launchConfig = {
      ...baseConfig,
      headless: this.config.headless,
    };

    logger.info('Launching browser with config:', {
      environment: isDocker ? 'docker' : 'npx',
      tabCount: this.config.tabCount,
      headless: this.config.headless,
    });

    this.browser = await puppeteer.launch(launchConfig);

    // 기존 페이지 닫기 (브라우저 시작 시 생성되는 빈 페이지)
    const existingPages = await this.browser.pages();
    for (const page of existingPages) {
      await page.close();
    }

    // 탭 풀 생성
    for (let i = 0; i < this.config.tabCount; i++) {
      const tabId = `tab-${i + 1}`;
      const page = await this.createPage();

      const tabInfo: TabInfo = {
        id: tabId,
        page,
        state: 'idle',
        currentUrl: null,
        lastActivityAt: Date.now(),
      };

      this.setupTabRecovery(tabInfo);
      this.tabs.set(tabId, tabInfo);
    }

    // 헬스 체크 시작
    this.startHealthMonitor();

    logger.info(`Tab pool initialized with ${this.config.tabCount} tabs`);
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    await page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);
    await page.setJavaScriptEnabled(true);

    return page;
  }

  private setupTabRecovery(tab: TabInfo): void {
    tab.page.on('error', async (error) => {
      logger.error(`Tab ${tab.id} crashed: ${error.message}`);
      tab.state = 'crashed';
      await this.recoverTab(tab.id);
    });

    tab.page.on('close', async () => {
      // 정상적인 종료가 아닌 경우에만 복구
      if (tab.state !== 'idle' && this.browser) {
        logger.warn(`Tab ${tab.id} closed unexpectedly`);
        tab.state = 'crashed';
        await this.recoverTab(tab.id);
      }
    });
  }

  private async recoverTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab || !this.browser) return;

    tab.state = 'recovering';
    logger.info(`Recovering tab ${tabId}...`);

    try {
      // 새 페이지 생성
      const newPage = await this.createPage();

      // 기존 페이지 정리 시도 (이미 닫혔을 수 있음)
      try {
        await tab.page.close();
      } catch {
        // 이미 닫힌 경우 무시
      }

      tab.page = newPage;
      tab.state = 'idle';
      tab.currentUrl = null;
      tab.lastActivityAt = Date.now();

      this.setupTabRecovery(tab);

      logger.info(`Tab ${tabId} recovered successfully`);
    } catch (error) {
      logger.error(`Failed to recover tab ${tabId}:`, error);
      // 복구 실패 시 crashed 상태 유지, 다음 헬스 체크에서 재시도
      tab.state = 'crashed';
    }
  }

  private startHealthMonitor(): void {
    // 30초마다 체크
    this.healthCheckInterval = setInterval(async () => {
      const now = Date.now();

      for (const [id, tab] of this.tabs) {
        // busy 상태이고 idleTimeout 초과 시 자동 해제
        if (tab.state === 'busy' && (now - tab.lastActivityAt) > this.config.idleTimeout) {
          logger.warn(`Auto-releasing idle tab: ${id} (inactive for ${Math.round((now - tab.lastActivityAt) / 1000)}s)`);
          await this.releaseTab(id);
        }

        // crashed 상태인 탭 복구 시도
        if (tab.state === 'crashed') {
          await this.recoverTab(id);
        }
      }
    }, 30000);
  }

  async acquireTab(): Promise<TabInfo> {
    for (const [, tab] of this.tabs) {
      if (tab.state === 'idle') {
        tab.state = 'busy';
        tab.lastActivityAt = Date.now();
        logger.info(`Tab ${tab.id} acquired`);
        return tab;
      }
    }

    throw new Error('No idle tabs available');
  }

  async releaseTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    // 탭 초기화 (about:blank로 이동)
    try {
      await tab.page.goto('about:blank');
    } catch (error) {
      logger.warn(`Failed to reset tab ${tabId} to about:blank:`, error);
    }

    tab.state = 'idle';
    tab.currentUrl = null;
    tab.lastActivityAt = Date.now();

    logger.info(`Tab ${tabId} released`);
  }

  getTab(tabId: string): TabInfo | undefined {
    const tab = this.tabs.get(tabId);
    if (tab) {
      // 활동 시간 업데이트
      tab.lastActivityAt = Date.now();
    }
    return tab;
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }

  getPoolStatus(): PoolStatus {
    let idle = 0;
    let busy = 0;

    for (const [, tab] of this.tabs) {
      if (tab.state === 'idle') {
        idle++;
      } else if (tab.state === 'busy') {
        busy++;
      }
    }

    return {
      total: this.tabs.size,
      idle,
      busy,
    };
  }

  async close(): Promise<void> {
    // 헬스 체크 중지
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // 브라우저 종료
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.tabs.clear();
    logger.info('Tab pool closed');
  }
}

// 싱글턴 인스턴스
export const tabPool = new TabPool();
