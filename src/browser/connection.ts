import puppeteer, { Browser, Page } from "puppeteer";
import { logger } from "../config/logger.js";
import { dockerConfig, npxConfig, DEFAULT_NAVIGATION_TIMEOUT } from "../config/browser.js";

// Global browser instance
let browser: Browser | undefined;
let page: Page | undefined;

export async function ensureBrowser(): Promise<Page> {
  if (!browser) {
    logger.info('Launching browser with config:', process.env.DOCKER_CONTAINER ? 'docker' : 'npx');
    browser = await puppeteer.launch(process.env.DOCKER_CONTAINER ? dockerConfig : npxConfig);
    const pages = await browser.pages();
    page = pages[0];

    // Set default navigation timeout
    await page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);
    
    // Enable JavaScript
    await page.setJavaScriptEnabled(true);
    
    logger.info('Browser launched successfully');
  }
  return page!;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = undefined;
    page = undefined;
  }
}

export function getCurrentPage(): Page | undefined {
  return page;
}
