# Puppeteer Swarm MCP

MCP server for browser automation with **tab pool** support using Puppeteer.

## Features

- **Tab Pool**: Manage multiple browser tabs concurrently
- **Auto-release**: Automatically release tabs after idle timeout (default: 5 minutes)
- **Auto-recovery**: Automatically recover crashed tabs
- **Configurable**: Set tab count and headless mode via CLI arguments

## Installation

### Option 1: Install from npm

```bash
npm install -g puppeteer-swarm-mcp
```

Or run directly using npx:

```bash
npx puppeteer-swarm-mcp
```

### Option 2: Install from source

```bash
git clone https://github.com/greatSumini/puppeteer-swarm-mcp.git
cd puppeteer-swarm-mcp
npm install
npm run build
```

## Usage

```bash
# Default: 5 tabs, headless=false
puppeteer-swarm-mcp

# Custom tab count
puppeteer-swarm-mcp --tabs=10

# Headless mode
puppeteer-swarm-mcp --headless

# Combined options
puppeteer-swarm-mcp --tabs=10 --headless
```

### Environment Variables

```bash
TAB_COUNT=10 HEADLESS=true puppeteer-swarm-mcp
```

## MCP Server Configuration

### For Claude Desktop App

Add the following to your Claude Desktop configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "puppeteer-swarm-mcp", "--tabs=5", "--headless"]
    }
  }
}
```

## Available Tools

### get_pool_status

Get the current status of the tab pool.

**Parameters**: None

**Returns**:
```json
{
  "total": 5,
  "idle": 3,
  "busy": 2
}
```

---

### navigate

Allocate an idle tab and navigate to a URL.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string | Yes | URL to navigate to |
| `waitUntil` | string | No | Wait condition (`load`, `domcontentloaded`, `networkidle0`, `networkidle2`) |

**Returns**:
```json
{
  "tabId": "tab-1",
  "url": "https://example.com",
  "title": "Example Domain"
}
```

---

### get_content

Extract HTML or text content from a page.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `type` | string | No | Extract format (`html`, `text`). Default: `text` |

**Returns**:
```json
{
  "content": "..."
}
```

---

### screenshot

Capture a page screenshot.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `fullPage` | boolean | No | Capture full page. Default: `false` |

**Returns**: Image content (base64 PNG)

---

### click

Click an element by CSS selector.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `selector` | string | Yes | CSS selector |

**Returns**:
```json
{
  "success": true
}
```

---

### type

Type text into an input field.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `selector` | string | Yes | CSS selector |
| `text` | string | Yes | Text to type |

**Returns**:
```json
{
  "success": true
}
```

---

### evaluate

Execute JavaScript in the page context.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `script` | string | Yes | JavaScript code to execute |

**Returns**:
```json
{
  "result": "..."
}
```

---

### wait_for_selector

Wait for an element to appear in the DOM.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Target tab ID |
| `selector` | string | Yes | CSS selector |
| `timeout` | number | No | Timeout in ms. Default: `30000` |

**Returns**:
```json
{
  "success": true
}
```

---

### release_tab

Release a tab back to idle state.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tabId` | string | Yes | Tab ID to release |

**Returns**:
```json
{
  "success": true
}
```

## Workflow Example

```
1. navigate({ url: "https://example.com" })
   -> Returns { tabId: "tab-1", ... }

2. get_content({ tabId: "tab-1", type: "text" })
   -> Returns page content

3. click({ tabId: "tab-1", selector: "button.submit" })
   -> Click a button

4. release_tab({ tabId: "tab-1" })
   -> Release the tab for reuse
```

## Logging

Logs are stored in the `logs/` directory:
- File Pattern: `mcp-puppeteer-YYYY-MM-DD.log`
- Daily rotation, max 20MB per file
- 14 days retention with auto-compression

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Choi Sumin** - [GitHub](https://github.com/greatSumini)
