# Shared Types and Utilities

前後端共享的類型定義和工具函式庫。

## 概述

這個目錄包含了 Ramen 專案中前後端共享的類型定義、驗證器和序列化工具。所有類型都在 TypeScript（前端）和 Python/Pydantic（後端）中有對應的定義，確保前後端資料契約的一致性。

## 目錄結構

```
shared/
├── types/              # 類型定義
│   ├── common.ts       # 通用類型
│   ├── graph.ts        # 圖形資料結構
│   ├── websocket.ts    # WebSocket 協議
│   ├── api.ts          # API 類型
│   └── index.ts        # 統一匯出
├── validators/         # 驗證器
│   └── typeGuards.ts   # TypeScript 類型守衛
└── utils/              # 工具函式
    └── serializer.ts   # 序列化/反序列化
```

## 核心類型

### 圖形資料結構

```typescript
import { GraphData, NodeData, EdgeData } from '@/shared/types';

// 完整的圖形資料
interface GraphData {
    id: string;
    metadata: GraphMetadata;
    nodes: NodeData[];
    edges: EdgeData[];
    variables?: Variable[];
}

// 節點資料
interface NodeData {
    id: string;
    type: string;
    position: Position;
    data: Record<string, any>;
    metadata?: NodeMetadata;
    inputs?: PortData[];
    outputs?: PortData[];
}

// 連接邊資料
interface EdgeData {
    id: string;
    source: string;
    source_handle: string;
    target: string;
    target_handle: string;
}
```

### WebSocket 訊息協議

```typescript
import { MessageType, WebSocketMessage, WebSocketResponse } from '@/shared/types';

// 訊息類型枚舉
enum MessageType {
    LOAD_GRAPH = 'load_graph',
    SAVE_GRAPH = 'save_graph',
    EXECUTE_GRAPH = 'execute_graph',
    // ... 更多類型
}

// WebSocket 訊息
interface WebSocketMessage<T = any> {
    type: MessageType | string;
    request_id?: string;
    data?: T;
    timestamp?: string;
}

// WebSocket 回應
interface WebSocketResponse<T = any> {
    type: MessageType | string;
    request_id?: string;
    success: boolean;
    data?: T;
    timestamp?: string;
}
```

## 使用範例

### 1. 基本使用

```typescript
import { GraphData, NodeData, MessageType } from '@/shared/types';

// 建立圖形資料
const graph: GraphData = {
    id: 'my-graph',
    metadata: {
        name: 'My First Graph',
        created_at: new Date().toISOString()
    },
    nodes: [],
    edges: []
};

// 建立節點
const node: NodeData = {
    id: 'node-1',
    type: 'core.math.add',
    position: { x: 100, y: 100 },
    data: {
        value_a: 10,
        value_b: 20
    }
};
```

### 2. WebSocket 通訊

```typescript
import {
    MessageType,
    WebSocketMessage,
    LoadGraphRequest
} from '@/shared/types';

// 發送載入圖形請求
const message: WebSocketMessage<LoadGraphRequest> = {
    type: MessageType.LOAD_GRAPH,
    request_id: generateUUID(),
    data: {
        path: '/path/to/graph.ramen'
    }
};

await websocket.send(JSON.stringify(message));

// 處理回應
websocket.on('message', (data: string) => {
    const response: WebSocketResponse = JSON.parse(data);

    if (response.success && response.type === MessageType.GRAPH_RESPONSE) {
        const graphData = response.data.graph as GraphData;
        // 處理圖形資料...
    }
});
```

### 3. 序列化/反序列化

```typescript
import { serialize, deserialize, keysToCamel, keysToSnake } from '@/shared/utils/serializer';

// 從後端接收的資料（snake_case）
const backendData = {
    graph_id: 'abc',
    node_count: 10,
    created_at: '2024-10-03'
};

// 自動轉換為 camelCase
const frontendData = keysToCamel(backendData);
// { graphId: 'abc', nodeCount: 10, createdAt: '2024-10-03' }

// 發送給後端時自動轉為 snake_case
const sendData = keysToSnake(frontendData);
```

### 4. 類型守衛和驗證

```typescript
import {
    isGraphData,
    isNodeData,
    isWebSocketResponse,
    assertType
} from '@/shared/validators/typeGuards';

// 運行時類型檢查
function processData(data: unknown) {
    if (isGraphData(data)) {
        // TypeScript 現在知道 data 是 GraphData
        console.log(`Graph has ${data.nodes.length} nodes`);
    }
}

// 斷言類型（失敗時拋出異常）
function requireGraph(data: unknown): GraphData {
    assertType(data, isGraphData, 'Invalid graph data');
    return data; // TypeScript 知道這是 GraphData
}
```

### 5. API 回應處理

```typescript
import { ApiResponse, ErrorInfo } from '@/shared/types';

// 處理 API 回應
async function loadGraph(path: string): Promise<GraphData> {
    const response = await fetch(`/api/graphs/load?path=${path}`);
    const apiResponse: ApiResponse<GraphData> = await response.json();

    if (!apiResponse.success) {
        throw new Error(apiResponse.error?.message || 'Unknown error');
    }

    return apiResponse.data!;
}
```

## 命名規範

### TypeScript (前端)
- 內部使用：`camelCase`
- 與後端通訊：`snake_case`（自動轉換）

### Python (後端)
- 統一使用：`snake_case`
- Pydantic model 自動處理序列化

### 自動轉換

序列化工具會自動處理命名轉換：

```typescript
// Frontend -> Backend
const data = { userId: '123', userName: 'John' };
const json = serialize(data);
// JSON: {"user_id": "123", "user_name": "John"}

// Backend -> Frontend
const json = '{"user_id": "123", "user_name": "John"}';
const data = deserialize(json);
// data: { userId: '123', userName: 'John' }
```

## 最佳實踐

### 1. 總是使用共享類型

❌ **不好的做法：**
```typescript
// 使用 any 或自定義介面
const data: any = { ... };
```

✅ **好的做法：**
```typescript
// 使用共享類型
import { GraphData } from '@/shared/types';
const data: GraphData = { ... };
```

### 2. 使用類型守衛驗證運行時資料

❌ **不好的做法：**
```typescript
// 假設資料總是正確的
const graph = data as GraphData;
```

✅ **好的做法：**
```typescript
// 驗證後再使用
if (isGraphData(data)) {
    const graph = data;
    // 安全使用...
}
```

### 3. 使用序列化工具處理命名轉換

❌ **不好的做法：**
```typescript
// 手動轉換欄位名稱
const backendData = {
    graph_id: frontendData.graphId,
    node_count: frontendData.nodeCount
};
```

✅ **好的做法：**
```typescript
// 自動轉換
const backendData = keysToSnake(frontendData);
```

## 與後端的對應

所有 TypeScript 類型在 Python 中都有對應的 Pydantic model：

| TypeScript | Python |
|------------|--------|
| `GraphData` | `ramen.shared.types.GraphData` |
| `NodeData` | `ramen.shared.types.NodeData` |
| `EdgeData` | `ramen.shared.types.EdgeData` |
| `MessageType` | `ramen.shared.types.MessageType` |
| `WebSocketMessage` | `ramen.shared.types.WebSocketMessage` |

範例：

**TypeScript:**
```typescript
const graph: GraphData = { ... };
```

**Python:**
```python
from ramen.shared.types import GraphData

graph = GraphData(...)
```

## 更新類型定義

如果需要修改類型定義：

1. 修改 `shared/types/` 中的 TypeScript 定義
2. 同步修改 `src/ramen/shared/types/` 中的 Python 定義
3. 執行測試確保相容性
4. 更新相關文件

## 參考資料

- [TypeScript Handbook - Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [WebSocket Protocol](../../../docs/websocket-protocol.md)
