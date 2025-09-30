# WebSocket API 文檔

Ramen 已將所有 HTTP API 端點遷移到統一的 WebSocket 端點，提供更高效的實時通訊。

## 連接

### WebSocket 端點
```
ws://localhost:8000/ws
```

### 連接流程

1. 建立 WebSocket 連接
2. 接收 `connected` 訊息，包含 `session_id`
3. 發送請求訊息
4. 接收對應的回應訊息

## 訊息格式

### 請求格式
```json
{
  "type": "message_type",
  "request_id": "optional-request-id",
  "data": {
    // 請求相關數據
  }
}
```

### 回應格式
```json
{
  "type": "response_type",
  "request_id": "optional-request-id",
  "success": true,
  "timestamp": "2025-09-30T12:00:00",
  "data": {
    // 回應數據
  }
}
```

### 錯誤格式
```json
{
  "type": "error",
  "request_id": "optional-request-id",
  "error": "錯誤訊息",
  "timestamp": "2025-09-30T12:00:00"
}
```

## API 端點

### 連接管理

#### Ping/Pong
保持連接活躍

**請求:**
```json
{
  "type": "ping",
  "request_id": "ping-1"
}
```

**回應:**
```json
{
  "type": "pong",
  "request_id": "ping-1",
  "success": true,
  "data": {
    "timestamp": "2025-09-30T12:00:00"
  }
}
```

---

### Nodes API

#### 獲取所有節點
獲取可用節點列表

**請求:**
```json
{
  "type": "get_nodes",
  "request_id": "get-nodes-1"
}
```

**回應:**
```json
{
  "type": "nodes_response",
  "request_id": "get-nodes-1",
  "success": true,
  "data": {
    "nodes": {
      "Core": [...],
      "Math": [...],
      "Logic": [...]
    },
    "total_count": 196
  }
}
```

#### 獲取節點元數據
獲取特定節點的詳細資訊

**請求:**
```json
{
  "type": "get_node_metadata",
  "request_id": "get-metadata-1",
  "data": {
    "node_type": "core.input"
  }
}
```

**回應:**
```json
{
  "type": "node_metadata_response",
  "request_id": "get-metadata-1",
  "success": true,
  "data": {
    "metadata": {
      "id": "core.input",
      "name": "Input",
      "category": "Core",
      "inputs": [...],
      "outputs": [...]
    }
  }
}
```

#### 獲取 Toppings
獲取已載入的 topping 套件

**請求:**
```json
{
  "type": "get_toppings",
  "request_id": "get-toppings-1"
}
```

**回應:**
```json
{
  "type": "toppings_response",
  "request_id": "get-toppings-1",
  "success": true,
  "data": {
    "toppings": [
      {
        "name": "ramen-core",
        "node_count": 196
      }
    ],
    "total_count": 1
  }
}
```

---

### Registry API

#### 查詢節點（帶過濾）
從註冊表查詢節點，支援分類、命名空間、搜尋過濾

**請求:**
```json
{
  "type": "registry_get_nodes",
  "request_id": "search-nodes-1",
  "data": {
    "category": "Math",
    "namespace": null,
    "search": "add"
  }
}
```

**回應:**
```json
{
  "type": "registry_response",
  "request_id": "search-nodes-1",
  "success": true,
  "data": {
    "nodes": {...},
    "total_count": 5,
    "filters": {
      "category": "Math",
      "namespace": null,
      "search": "add"
    }
  }
}
```

#### 獲取特定節點
從註冊表獲取單一節點

**請求:**
```json
{
  "type": "registry_get_node",
  "request_id": "get-node-1",
  "data": {
    "node_id": "math.add"
  }
}
```

#### 獲取所有分類
獲取節點分類列表

**請求:**
```json
{
  "type": "registry_get_categories",
  "request_id": "get-categories-1"
}
```

**回應:**
```json
{
  "type": "registry_response",
  "request_id": "get-categories-1",
  "success": true,
  "data": {
    "categories": [
      {"name": "Core", "node_count": 50},
      {"name": "Math", "node_count": 30}
    ],
    "total_categories": 2
  }
}
```

#### 獲取所有命名空間
獲取節點命名空間列表

**請求:**
```json
{
  "type": "registry_get_namespaces",
  "request_id": "get-namespaces-1"
}
```

#### 獲取註冊表統計
獲取註冊表統計資訊

**請求:**
```json
{
  "type": "registry_get_stats",
  "request_id": "get-stats-1"
}
```

**回應:**
```json
{
  "type": "registry_response",
  "request_id": "get-stats-1",
  "success": true,
  "data": {
    "stats": {
      "total_nodes": 196,
      "categories": 10,
      "namespaces": 12
    }
  }
}
```

---

### Execution API

#### 執行圖形
執行 Ramen 圖形

**請求:**
```json
{
  "type": "execute_graph",
  "request_id": "execute-1",
  "data": {
    "graph": {...},
    "inputs": {"input1": "value1"},
    "session_id": "optional-session-id",
    "force_takeover": false,
    "compile_mode": "JIT"
  }
}
```

**即時回應（執行開始）:**
```json
{
  "type": "execution_started",
  "request_id": "execute-1",
  "session_id": "session-123",
  "graph_id": "graph-456",
  "timestamp": "2025-09-30T12:00:00"
}
```

**最終回應（執行完成）:**
```json
{
  "type": "execution_completed",
  "request_id": "execute-1",
  "success": true,
  "data": {
    "session_id": "session-123",
    "execution_id": "exec-789",
    "outputs": {"output1": "result1"},
    "errors": [],
    "execution_time": 0.123
  }
}
```

#### 獲取執行狀態
查詢執行狀態

**請求:**
```json
{
  "type": "get_execution_status",
  "request_id": "status-1",
  "data": {
    "session_id": "session-123"
  }
}
```

**回應:**
```json
{
  "type": "execution_status_response",
  "request_id": "status-1",
  "success": true,
  "data": {
    "session_id": "session-123",
    "state": "running"
  }
}
```

#### 獲取執行結果
獲取最後的執行結果

**請求:**
```json
{
  "type": "get_execution_results",
  "request_id": "results-1",
  "data": {
    "session_id": "session-123"
  }
}
```

**回應:**
```json
{
  "type": "execution_results_response",
  "request_id": "results-1",
  "success": true,
  "data": {
    "outputs": {...},
    "execution_time": 0.123
  }
}
```

#### 取消執行
取消正在執行的圖形

**請求:**
```json
{
  "type": "cancel_execution",
  "request_id": "cancel-1",
  "data": {
    "session_id": "session-123"
  }
}
```

**回應:**
```json
{
  "type": "execution_cancelled",
  "request_id": "cancel-1",
  "success": true,
  "data": {
    "message": "Execution cancelled",
    "session_id": "session-123"
  }
}
```

---

### Session Management

#### 建立會話
建立新的執行會話

**請求:**
```json
{
  "type": "create_session",
  "request_id": "create-session-1",
  "data": {
    "graph_id": "graph-123",
    "user_id": "user-456",
    "force_takeover": false
  }
}
```

**回應:**
```json
{
  "type": "session_response",
  "request_id": "create-session-1",
  "success": true,
  "data": {
    "session_id": "session-789",
    "graph_id": "graph-123",
    "user_id": "user-456",
    "created_at": "2025-09-30T12:00:00",
    "last_activity": "2025-09-30T12:00:00",
    "is_active": true
  }
}
```

#### 獲取會話
獲取會話資訊

**請求:**
```json
{
  "type": "get_session",
  "request_id": "get-session-1",
  "data": {
    "session_id": "session-789"
  }
}
```

#### 關閉會話
關閉執行會話

**請求:**
```json
{
  "type": "close_session",
  "request_id": "close-session-1",
  "data": {
    "session_id": "session-789"
  }
}
```

#### 列出會話
列出所有會話

**請求:**
```json
{
  "type": "list_sessions",
  "request_id": "list-sessions-1",
  "data": {
    "user_id": "user-456",
    "active_only": true
  }
}
```

**回應:**
```json
{
  "type": "sessions_response",
  "request_id": "list-sessions-1",
  "success": true,
  "data": {
    "sessions": [...]
  }
}
```

---

### Graph API

#### 載入圖形
從檔案載入圖形

**請求:**
```json
{
  "type": "load_graph",
  "request_id": "load-graph-1",
  "data": {
    "path": "/path/to/graph.ramen"
  }
}
```

**回應:**
```json
{
  "type": "graph_response",
  "request_id": "load-graph-1",
  "success": true,
  "data": {
    "message": "Successfully loaded graph: My Graph",
    "graph": {...},
    "dependencies": {...}
  }
}
```

#### 保存圖形
保存圖形到檔案

**請求:**
```json
{
  "type": "save_graph",
  "request_id": "save-graph-1",
  "data": {
    "path": "/path/to/graph.ramen",
    "graph": {...},
    "dependencies": {...}
  }
}
```

**回應:**
```json
{
  "type": "graph_response",
  "request_id": "save-graph-1",
  "success": true,
  "data": {
    "message": "Successfully saved graph to /path/to/graph.ramen"
  }
}
```

#### 檢查依賴
檢查圖形的依賴狀態

**請求:**
```json
{
  "type": "check_dependencies",
  "request_id": "check-deps-1",
  "data": {
    "graph_path": "/path/to/graph.ramen"
  }
}
```

**回應:**
```json
{
  "type": "graph_response",
  "request_id": "check-deps-1",
  "success": true,
  "data": {
    "missing": ["numpy", "pandas"],
    "available": ["matplotlib"]
  }
}
```

#### 列出圖形
列出目錄中的圖形檔案

**請求:**
```json
{
  "type": "list_graphs",
  "request_id": "list-graphs-1",
  "data": {
    "directory": "/path/to/graphs"
  }
}
```

**回應:**
```json
{
  "type": "graphs_response",
  "request_id": "list-graphs-1",
  "success": true,
  "data": {
    "message": "Found 5 graphs",
    "graphs": [
      {
        "path": "/path/to/graph1.ramen",
        "id": "graph-1",
        "name": "My Graph",
        "description": "Description"
      }
    ]
  }
}
```

---

### System API

#### 獲取系統統計
獲取系統性能統計

**請求:**
```json
{
  "type": "get_system_stats",
  "request_id": "stats-1"
}
```

**回應:**
```json
{
  "type": "system_response",
  "request_id": "stats-1",
  "success": true,
  "data": {
    "stats": {
      "performance": {...},
      "memory": {...}
    }
  }
}
```

#### 系統清理
執行系統記憶體清理

**請求:**
```json
{
  "type": "system_cleanup",
  "request_id": "cleanup-1"
}
```

**回應:**
```json
{
  "type": "system_response",
  "request_id": "cleanup-1",
  "success": true,
  "data": {
    "message": "System cleanup completed",
    "cleanup_stats": {...}
  }
}
```

#### 系統健康檢查
檢查系統健康狀態

**請求:**
```json
{
  "type": "system_health",
  "request_id": "health-1"
}
```

**回應:**
```json
{
  "type": "system_response",
  "request_id": "health-1",
  "success": true,
  "data": {
    "health_status": "healthy",
    "issues": [],
    "stats": {...}
  }
}
```

---

### Git API

#### Git 差異
比較兩個圖形版本的差異

**請求:**
```json
{
  "type": "git_diff",
  "request_id": "diff-1",
  "data": {
    "old_graph": {...},
    "new_graph": {...},
    "from_version": "v1",
    "to_version": "v2"
  }
}
```

**回應:**
```json
{
  "type": "git_response",
  "request_id": "diff-1",
  "success": true,
  "data": {
    "from_version": "v1",
    "to_version": "v2",
    "total_changes": 10,
    "nodes_added": [...],
    "nodes_removed": [...],
    "nodes_modified": [...],
    "summary": "..."
  }
}
```

#### Git 合併
執行三方合併

**請求:**
```json
{
  "type": "git_merge",
  "request_id": "merge-1",
  "data": {
    "base_graph": {...},
    "left_graph": {...},
    "right_graph": {...}
  }
}
```

#### Git 驗證
驗證圖形格式

**請求:**
```json
{
  "type": "git_validate",
  "request_id": "validate-1",
  "data": {
    "graph": {...}
  }
}
```

**回應:**
```json
{
  "type": "git_response",
  "request_id": "validate-1",
  "success": true,
  "data": {
    "valid": true,
    "graph_id": "graph-123",
    "nodes": 10,
    "edges": 15
  }
}
```

#### Git 歷史
獲取圖形的 Git 提交歷史

**請求:**
```json
{
  "type": "git_history",
  "request_id": "history-1",
  "data": {
    "graph_path": "/path/to/graph.ramen",
    "max_count": 10
  }
}
```

**回應:**
```json
{
  "type": "git_response",
  "request_id": "history-1",
  "success": true,
  "data": {
    "graph_path": "/path/to/graph.ramen",
    "total_commits": 10,
    "commits": [...],
    "branches": ["main", "develop"],
    "current_branch": "main"
  }
}
```

#### Git 分支
獲取 Git 分支列表

**請求:**
```json
{
  "type": "git_branches",
  "request_id": "branches-1"
}
```

**回應:**
```json
{
  "type": "git_response",
  "request_id": "branches-1",
  "success": true,
  "data": {
    "current_branch": "main",
    "branches": [
      {"name": "main", "current": true},
      {"name": "develop", "current": false}
    ]
  }
}
```

---

### Frontend Components API

#### 獲取元件清單
獲取所有前端元件的清單

**請求:**
```json
{
  "type": "get_component_manifest",
  "request_id": "manifest-1"
}
```

**回應:**
```json
{
  "type": "frontend_response",
  "request_id": "manifest-1",
  "success": true,
  "data": {
    "manifest": {...}
  }
}
```

#### 發現元件
重新掃描並發現所有可用元件

**請求:**
```json
{
  "type": "discover_components",
  "request_id": "discover-1"
}
```

**回應:**
```json
{
  "type": "frontend_response",
  "request_id": "discover-1",
  "success": true,
  "data": {
    "components": {...},
    "total_packages": 5,
    "total_components": 50
  }
}
```

#### 獲取節點元件
獲取特定節點類型的前端元件

**請求:**
```json
{
  "type": "get_component_for_node",
  "request_id": "get-component-1",
  "data": {
    "node_type": "plots.matplotlib"
  }
}
```

**回應:**
```json
{
  "type": "frontend_response",
  "request_id": "get-component-1",
  "success": true,
  "data": {
    "component": {...}
  }
}
```

---

## 使用範例

### JavaScript/TypeScript

```typescript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'connected') {
    console.log('Session ID:', message.session_id);

    // 獲取節點列表
    ws.send(JSON.stringify({
      type: 'get_nodes',
      request_id: 'req-1'
    }));
  }

  if (message.type === 'nodes_response') {
    console.log('Nodes:', message.data.nodes);
    console.log('Total count:', message.data.total_count);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Python

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"

    async with websockets.connect(uri) as websocket:
        # 接收連接訊息
        connected = await websocket.recv()
        print(f"Connected: {connected}")

        # 發送請求
        request = {
            "type": "get_nodes",
            "request_id": "req-1"
        }
        await websocket.send(json.dumps(request))

        # 接收回應
        response = await websocket.recv()
        data = json.loads(response)
        print(f"Response: {data}")

asyncio.run(test_websocket())
```

## 遷移指南

### 從 HTTP API 遷移到 WebSocket

#### 舊的 HTTP 方式
```javascript
// HTTP GET
const response = await fetch('http://localhost:8000/api/nodes');
const data = await response.json();
```

#### 新的 WebSocket 方式
```javascript
// WebSocket
ws.send(JSON.stringify({
  type: 'get_nodes',
  request_id: 'unique-id'
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.request_id === 'unique-id') {
    // 處理回應
  }
};
```

### 優勢

1. **持久連接**: 不需要每次請求都建立新連接
2. **雙向通訊**: 伺服器可以主動推送更新
3. **更低延遲**: 減少 HTTP 握手開銷
4. **實時更新**: 執行狀態可以即時推送
5. **統一介面**: 所有 API 使用相同的訊息格式

## 測試

執行 WebSocket API 測試：

```bash
uv run pytest src/ramen/tests/test_websocket_api.py -v
```

所有測試應該通過，確保 WebSocket API 正常運作。