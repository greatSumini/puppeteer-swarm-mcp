import { Page } from "puppeteer";

export type TabState = 'idle' | 'busy' | 'crashed' | 'recovering';

export interface TabInfo {
  id: string;
  page: Page;
  state: TabState;
  currentUrl: string | null;
  lastActivityAt: number;
}

export interface TabPoolConfig {
  tabCount: number;       // CLI: --tabs, 기본값: 5
  headless: boolean;      // CLI: --headless
  idleTimeout: number;    // 자동 해제 타임아웃 (ms), 기본값: 300000 (5분)
}

export interface PoolStatus {
  total: number;
  idle: number;
  busy: number;
}
