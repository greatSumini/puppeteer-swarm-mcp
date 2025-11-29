import { CallToolResult, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../config/logger.js";
import { tabPool } from "../browser/tab-pool.js";
import { getCliConfig, initializeTabPool, closeBrowser } from "../browser/connection.js";
import { browserStateManager } from "../browser/state-manager.js";
import { validateToolAccess } from "./access-control.js";
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

/**
 * 스크립트가 단일 표현식인지 판별
 */
function isSingleExpression(script: string): boolean {
  const trimmed = script.trim();

  // return으로 시작하면 복합 스크립트
  if (/^return\b/.test(trimmed)) {
    return false;
  }

  // 세미콜론이 중간에 있으면 여러 문장
  const withoutTrailingSemicolon = trimmed.replace(/;$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    return false;
  }

  // 여러 줄 + 제어문 포함 시 복합 스크립트
  if (trimmed.includes('\n')) {
    if (/\b(if|for|while|switch|try|const|let|var|function|class)\b/.test(trimmed)) {
      return false;
    }
  }

  return true;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  logger.debug('Tool call received', { tool: name, arguments: args });

  // 접근 제어 검증
  const accessResult = validateToolAccess(name);
  if (!accessResult.allowed) {
    return errorResult(accessResult.error!);
  }

  try {
    switch (name) {
      case "launch": {
        if (browserStateManager.isLaunched()) {
          return errorResult("브라우저가 이미 실행 중입니다.");
        }

        const config = getCliConfig();
        await initializeTabPool(config);
        browserStateManager.setLaunched();

        logger.info('Browser launched via tool', { config });
        return successResult({
          message: "브라우저가 성공적으로 시작되었습니다.",
          config,
        });
      }

      case "close": {
        if (!browserStateManager.isLaunched()) {
          return errorResult("브라우저가 실행 중이 아닙니다.");
        }

        await closeBrowser();
        browserStateManager.setClosed();

        logger.info('Browser closed via tool');
        return successResult({ message: "브라우저가 종료되었습니다." });
      }

      case "get_pool_status": {
        if (!browserStateManager.isLaunched()) {
          return successResult({
            initialized: false,
            message: "브라우저가 초기화되지 않았습니다. 먼저 'launch' 도구를 호출하세요.",
          });
        }

        const status = tabPool.getPoolStatus();
        return successResult({ initialized: true, ...status });
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

        if (!script || script.trim().length === 0) {
          return errorResult('Script cannot be empty');
        }

        const trimmedScript = script.trim();

        logger.debug('Executing script in browser', {
          tabId,
          scriptLength: trimmedScript.length
        });

        const shouldAutoReturn = isSingleExpression(trimmedScript);
        const executableScript = shouldAutoReturn
          ? `return (${trimmedScript.replace(/;$/, '')})`
          : trimmedScript;

        try {
          const evalResult = await tab.page.evaluate(`(async () => {
            try {
              const __result__ = await (async () => { ${executableScript} })();
              return { result: __result__, isError: false };
            } catch (__e__) {
              return { result: null, isError: true, error: __e__.message };
            }
          })()`);

          const typedResult = evalResult as { result: unknown; isError: boolean; error?: string };

          if (typedResult.isError) {
            return errorResult(`Script error: ${typedResult.error}`);
          }

          return successResult({ result: typedResult.result });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Script execution failed', { tabId, error: errorMessage });
          return errorResult(`Execution failed: ${errorMessage}`);
        }
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
