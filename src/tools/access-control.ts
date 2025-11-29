import { browserStateManager } from "../browser/state-manager.js";

export type ToolCategory = 'lifecycle' | 'status' | 'browser-action';

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  'launch': 'lifecycle',
  'close': 'lifecycle',
  'get_pool_status': 'status',
  'navigate': 'browser-action',
  'get_content': 'browser-action',
  'screenshot': 'browser-action',
  'click': 'browser-action',
  'type': 'browser-action',
  'evaluate': 'browser-action',
  'wait_for_selector': 'browser-action',
  'release_tab': 'browser-action',
};

export interface ToolAccessResult {
  allowed: boolean;
  error?: string;
}

export function validateToolAccess(toolName: string): ToolAccessResult {
  const category = TOOL_CATEGORIES[toolName];

  if (!category) {
    return { allowed: false, error: `Unknown tool: ${toolName}` };
  }

  // lifecycle과 status 도구는 항상 접근 가능
  if (category === 'lifecycle' || category === 'status') {
    return { allowed: true };
  }

  // browser-action 도구는 브라우저가 실행 중일 때만 접근 가능
  if (category === 'browser-action') {
    if (!browserStateManager.isLaunched()) {
      return {
        allowed: false,
        error: "브라우저가 초기화되지 않았습니다. 먼저 'launch' 도구를 호출하세요."
      };
    }
  }

  return { allowed: true };
}
