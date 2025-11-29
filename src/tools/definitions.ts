import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: Tool[] = [
  {
    name: "get_pool_status",
    description: "탭 풀의 현재 상태를 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "navigate",
    description: "idle 상태의 탭을 할당받아 지정된 URL로 이동합니다.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "이동할 URL" },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
          description: "대기 조건",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_content",
    description: "페이지의 HTML 또는 텍스트 콘텐츠를 추출합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        type: {
          type: "string",
          enum: ["html", "text"],
          description: "추출 형식 (기본: text)",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "screenshot",
    description: "페이지 스크린샷을 캡처합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        fullPage: {
          type: "boolean",
          description: "전체 페이지 캡처 여부 (기본: false)",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "click",
    description: "지정된 셀렉터의 요소를 클릭합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        selector: { type: "string", description: "CSS 셀렉터" },
      },
      required: ["tabId", "selector"],
    },
  },
  {
    name: "type",
    description: "지정된 셀렉터의 입력 필드에 텍스트를 입력합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        selector: { type: "string", description: "CSS 셀렉터" },
        text: { type: "string", description: "입력할 텍스트" },
      },
      required: ["tabId", "selector", "text"],
    },
  },
  {
    name: "evaluate",
    description: "페이지 컨텍스트에서 JavaScript를 실행합니다. 단일 표현식(예: 'document.title', '1 + 1')은 자동으로 결과가 반환됩니다. 복잡한 스크립트는 'return' 문을 명시적으로 사용하세요.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        script: {
          type: "string",
          description: "실행할 JavaScript 코드. 단일 표현식은 자동 반환, 복잡한 로직은 return 문 필요",
        },
      },
      required: ["tabId", "script"],
    },
  },
  {
    name: "wait_for_selector",
    description: "지정된 셀렉터가 DOM에 나타날 때까지 대기합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "대상 탭 ID" },
        selector: { type: "string", description: "CSS 셀렉터" },
        timeout: {
          type: "number",
          description: "타임아웃 (ms, 기본: 30000)",
        },
      },
      required: ["tabId", "selector"],
    },
  },
  {
    name: "release_tab",
    description: "사용 완료된 탭을 idle 상태로 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "반환할 탭 ID" },
      },
      required: ["tabId"],
    },
  },
];
