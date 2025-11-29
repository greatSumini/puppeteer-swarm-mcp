import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./config/logger.js";
import { TOOLS } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";
import { initializeTabPool, closeBrowser } from "./browser/connection.js";

// CLI 인자 파싱
function parseArgs(): { tabCount: number; headless: boolean } {
  const args = process.argv.slice(2);

  // --tabs=N 형식 파싱
  const tabsArg = args.find(a => a.startsWith('--tabs='));
  const tabCount = tabsArg
    ? parseInt(tabsArg.split('=')[1], 10)
    : parseInt(process.env.TAB_COUNT ?? '5', 10);

  // --headless 플래그 파싱
  const headless = args.includes('--headless') || process.env.HEADLESS === 'true';

  return { tabCount, headless };
}

// Create and configure server
const server = new Server(
  {
    name: "puppeteer-swarm-mcp",
    version: "0.8.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Setup tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {})
);

// Handle server shutdown
process.stdin.on("close", async () => {
  logger.info("Puppeteer MCP Server closing");
  await closeBrowser();
  await server.close();
});

// Start the server
export async function runServer() {
  try {
    const { tabCount, headless } = parseArgs();

    logger.info('Starting MCP server', { tabCount, headless });

    // 탭 풀 초기화
    await initializeTabPool({
      tabCount,
      headless,
      idleTimeout: 300000, // 5분
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP server started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}
