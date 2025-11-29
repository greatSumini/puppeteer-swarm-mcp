## 이름

puppeteer-swarm-mcp

## 컨셉

- 하나의 browser instance 내부에 여러개의 tab을 띄워놓고, 요청이 들어왔을 때 idle 상태의 tab을 할당해줘서 multi threading을 지원한다.
- 서버 시작과 동시에 browser instance를 실행하고, argument로 제공된 TAB_COUNT 변수만큼의 tab을 띄운다. (기본값: 5)
- headless argument를 지정할 수 있다.

## 제공 tool

# Tool 목록

## 1. get_pool_status

탭 풀의 현재 상태를 조회합니다.

### Parameters

없음

### Returns

```json
{
  "total": 5,
  "idle": 3,
  "busy": 2
}
```

---

## 2. navigate

idle 상태의 탭을 할당받아 지정된 URL로 이동합니다.

### Parameters

| Name        | Type   | Required | Description                                                            |
| ----------- | ------ | -------- | ---------------------------------------------------------------------- |
| `url`       | string | ✓        | 이동할 URL                                                             |
| `waitUntil` | string |          | 대기 조건 (`load`, `domcontentloaded`, `networkidle0`, `networkidle2`) |

### Returns

```json
{
  "tabId": "tab-1",
  "url": "https://example.com",
  "title": "Example Domain"
}
```

---

## 3. get_content

페이지의 HTML 또는 텍스트 콘텐츠를 추출합니다.

### Parameters

| Name    | Type   | Required | Description                                |
| ------- | ------ | -------- | ------------------------------------------ |
| `tabId` | string | ✓        | 대상 탭 ID                                 |
| `type`  | string |          | 추출 형식 (`html`, `text`). 기본값: `text` |

### Returns

```json
{
  "content": "..."
}
```

---

## 4. screenshot

페이지 스크린샷을 캡처합니다.

### Parameters

| Name       | Type    | Required | Description                            |
| ---------- | ------- | -------- | -------------------------------------- |
| `tabId`    | string  | ✓        | 대상 탭 ID                             |
| `fullPage` | boolean |          | 전체 페이지 캡처 여부. 기본값: `false` |

### Returns

```json
{
  "image": "base64..."
}
```

---

## 5. click

지정된 셀렉터의 요소를 클릭합니다.

### Parameters

| Name       | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| `tabId`    | string | ✓        | 대상 탭 ID  |
| `selector` | string | ✓        | CSS 셀렉터  |

### Returns

```json
{
  "success": true
}
```

---

## 6. type

지정된 셀렉터의 입력 필드에 텍스트를 입력합니다.

### Parameters

| Name       | Type   | Required | Description   |
| ---------- | ------ | -------- | ------------- |
| `tabId`    | string | ✓        | 대상 탭 ID    |
| `selector` | string | ✓        | CSS 셀렉터    |
| `text`     | string | ✓        | 입력할 텍스트 |

### Returns

```json
{
  "success": true
}
```

---

## 7. evaluate

페이지 컨텍스트에서 JavaScript를 실행합니다.

### Parameters

| Name     | Type   | Required | Description            |
| -------- | ------ | -------- | ---------------------- |
| `tabId`  | string | ✓        | 대상 탭 ID             |
| `script` | string | ✓        | 실행할 JavaScript 코드 |

### Returns

```json
{
  "result": "..."
}
```

---

## 8. wait_for_selector

지정된 셀렉터가 DOM에 나타날 때까지 대기합니다.

### Parameters

| Name       | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| `tabId`    | string | ✓        | 대상 탭 ID                     |
| `selector` | string | ✓        | CSS 셀렉터                     |
| `timeout`  | number |          | 타임아웃 (ms). 기본값: `30000` |

### Returns

```json
{
  "success": true
}
```

---

## 9. release_tab

사용 완료된 탭을 idle 상태로 반환합니다.

### Parameters

| Name    | Type   | Required | Description  |
| ------- | ------ | -------- | ------------ |
| `tabId` | string | ✓        | 반환할 탭 ID |

### Returns

```json
{
  "success": true
}
```
