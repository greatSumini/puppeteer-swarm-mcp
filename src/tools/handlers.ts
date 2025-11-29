import { CallToolResult, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../config/logger.js";
import { tabPool } from "../browser/tab-pool.js";
import { PuppeteerLifeCycleEvent } from "puppeteer";

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function successResult(data: object): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    isError: false,
  };
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  logger.debug('Tool call received', { tool: name, arguments: args });

  try {
    switch (name) {
      case "get_pool_status": {
        const status = tabPool.getPoolStatus();
        return successResult(status);
      }

      case "navigate": {
        const url = args.url as string;
        const waitUntil = (args.waitUntil as PuppeteerLifeCycleEvent) || "load";

        const tab = await tabPool.acquireTab();

        try {
          logger.info(`Navigating tab ${tab.id} to URL`, { url });

          const response = await tab.page.goto(url, {
            waitUntil,
            timeout: 30000,
          });

          if (!response) {
            throw new Error('Navigation failed - no response received');
          }

          const status = response.status();
          if (status >= 400) {
            throw new Error(`HTTP error: ${status} ${response.statusText()}`);
          }

          const title = await tab.page.title();
          tab.currentUrl = url;

          logger.info(`Navigation successful`, { tabId: tab.id, url, status });

          return successResult({
            tabId: tab.id,
            url,
            title,
          });
        } catch (error) {
          // 네비게이션 실패 시 탭 해제
          await tabPool.releaseTab(tab.id);
          throw error;
        }
      }

      case "get_content": {
        const tabId = args.tabId as string;
        const contentType = (args.type as string) || "text";

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        const content = contentType === "html"
          ? await tab.page.content()
          : await tab.page.evaluate(() => document.body.innerText);

        return successResult({ content });
      }

      case "screenshot": {
        const tabId = args.tabId as string;
        const fullPage = (args.fullPage as boolean) ?? false;

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        const screenshot = await tab.page.screenshot({
          encoding: "base64",
          fullPage,
        });

        return {
          content: [
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
      }

      case "click": {
        const tabId = args.tabId as string;
        const selector = args.selector as string;

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        await tab.page.click(selector);
        return successResult({ success: true });
      }

      case "type": {
        const tabId = args.tabId as string;
        const selector = args.selector as string;
        const text = args.text as string;

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        await tab.page.type(selector, text);
        return successResult({ success: true });
      }

      case "evaluate": {
        const tabId = args.tabId as string;
        const script = args.script as string;

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        logger.debug('Executing script in browser', { tabId, scriptLength: script.length });

        const result = await tab.page.evaluate(`(async () => {
          try {
            const result = (function() { ${script} })();
            return result;
          } catch (e) {
            return { error: e.message };
          }
        })()`);

        return successResult({ result });
      }

      case "wait_for_selector": {
        const tabId = args.tabId as string;
        const selector = args.selector as string;
        const timeout = (args.timeout as number) ?? 30000;

        const tab = tabPool.getTab(tabId);
        if (!tab) {
          return errorResult(`Tab not found: ${tabId}`);
        }

        await tab.page.waitForSelector(selector, { timeout });
        return successResult({ success: true });
      }

      case "release_tab": {
        const tabId = args.tabId as string;

        await tabPool.releaseTab(tabId);
        return successResult({ success: true });
      }

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Tool execution failed', { tool: name, error: errorMessage });
    return errorResult(errorMessage);
  }
}
