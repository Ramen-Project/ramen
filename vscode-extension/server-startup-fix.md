# 伺服器重複啟動問題修復

## 問題描述

Ramen VSCode 擴展存在伺服器重複啟動的問題：
- 多個伺服器實例同時嘗試啟動
- 埠衝突導致後續啟動失敗
- 錯誤日誌：`ERROR: [Errno 98] error while attempting to bind on address ('127.0.0.1', 9000): address already in use`

## 根本原因

1. **競爭條件**：多個地方同時調用 `serverManager.start()`:
   - `extension.ts` - 自動啟動邏輯
   - `commands.ts` - 用戶命令觸發
   - `customEditorProvider.ts` - 開啟 .ramen 文件時
   - `websocketManager.ts` - WebSocket 連接時
   - `errorHandler.ts` - 錯誤恢復時

2. **缺乏併發控制**：原來的 `start()` 方法只檢查 `isServerRunning` 狀態，但在異步操作期間可能出現競爭條件

## 解決方案

### 1. 添加啟動鎖機制

```typescript
private isStarting: boolean = false; // 新增啟動標誌
```

### 2. 修改 start() 方法邏輯

```typescript
async start(): Promise<boolean> {
    // 檢查是否已運行
    if (this.isServerRunning) {
        return true;
    }
    
    // 檢查是否正在啟動
    if (this.isStarting) {
        // 等待當前啟動完成
        while (this.isStarting) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return this.isServerRunning;
    }
    
    this.isStarting = true;
    
    try {
        // 啟動邏輯...
    } finally {
        this.isStarting = false; // 確保狀態重置
    }
}
```

### 3. 狀態管理改進

- 在所有退出點重置 `isStarting` 標誌
- 在進程退出時重置狀態
- 在停止伺服器時重置狀態

## 修改的文件

- `src/extension/server/serverManager.ts`
  - 新增 `isStarting` 屬性
  - 修改 `start()` 方法添加併發控制
  - 在各個退出點重置狀態

## 預期效果

1. **防止重複啟動**：同時調用 `start()` 時，只有一個實際啟動，其他等待
2. **狀態一致性**：確保伺服器狀態與實際進程狀態一致
3. **錯誤減少**：避免埠衝突和重複啟動錯誤
4. **資源節約**：避免不必要的進程創建

## 測試建議

1. **並發啟動測試**：
   - 同時觸發多個啟動命令
   - 開啟多個 .ramen 文件
   - 檢查是否只有一個伺服器進程

2. **狀態檢查**：
   - 驗證伺服器面板狀態正確
   - 檢查進程 PID 唯一性

3. **錯誤處理**：
   - 測試啟動失敗時的狀態重置
   - 驗證錯誤恢復機制

## 其他改進建議

1. **添加日誌**：更詳細的啟動狀態日誌
2. **健康檢查**：定期檢查伺服器健康狀態
3. **自動清理**：檢測並清理僵屍進程
4. **配置驗證**：啟動前驗證埠可用性

## 注意事項

- 修改向後兼容，不影響現有 API
- 鎖機制基於輪詢，在高併發情況下可能需要更精密的同步機制
- 需要在實際使用中測試驗證效果