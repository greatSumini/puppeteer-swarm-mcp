import { tabPool } from "./tab-pool.js";
import { TabPoolConfig } from "../types/tab.js";
import { BrowserLaunchConfig } from "../types/browser-state.js";

let cliConfig: BrowserLaunchConfig | null = null;

export function setCliConfig(config: BrowserLaunchConfig): void {
  cliConfig = config;
}

export function getCliConfig(): BrowserLaunchConfig {
  if (!cliConfig) {
    throw new Error('CLI configuration not set');
  }
  return cliConfig;
}

export async function initializeTabPool(config: Partial<TabPoolConfig>): Promise<void> {
  await tabPool.initialize(config);
}

export function getTabPool() {
  return tabPool;
}

export async function closeBrowser(): Promise<void> {
  await tabPool.close();
}
