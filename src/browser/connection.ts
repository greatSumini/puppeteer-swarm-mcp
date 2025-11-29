import { tabPool } from "./tab-pool.js";
import { TabPoolConfig } from "../types/tab.js";

export async function initializeTabPool(config: Partial<TabPoolConfig>): Promise<void> {
  await tabPool.initialize(config);
}

export function getTabPool() {
  return tabPool;
}

export async function closeBrowser(): Promise<void> {
  await tabPool.close();
}
