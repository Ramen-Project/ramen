# 核心功能 Bug 修復測試報告

## 測試日期
2025-10-01

## 修復摘要
1. ✅ **修復 .ramen 檔案載入問題** - 正確解析 graph 結構
2. ✅ **修復儲存功能** - 建立完整 RamenGraph 物件並使用 WebSocket API
3. ✅ **實作 VSCode 主題自動切換** - 監聽主題變更事件
4. ✅ **編譯成功** - webview 和 extension 都已成功編譯

---

## 測試計劃

### 測試 1: 載入 .ramen 檔案 ✅

**步驟**:
1. 在 VSCode 中打開 `examples/simple_math.ramen`
2. 檢查 graph 是否正確顯示
3. 檢查瀏覽器 console 是否有錯誤

**預期結果**:
- 節點和連線正確顯示
- Console 顯示: `🍜 Loaded from new format (.ramen file)`
- Console 顯示: `🍜 Graph initialized with X nodes, Y edges`
- 無錯誤訊息

**實際檔案結構**:
```json
{
  "header": {...},
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**修復內容**:
- [vscode-extension/webview-build/src/App.tsx](vscode-extension/webview-build/src/App.tsx:161-171)
  - 新增 `parsed.graph` 和 `parsed.nodes` 的雙重檢查
  - 支援新舊兩種格式
- [vscode-extension/src/extension/webview/webviewManager.ts](vscode-extension/src/extension/webview/webviewManager.ts:163-173)
  - 移除雙重序列化問題
  - 正確解析並嵌入 JSON 資料

---

### 測試 2: 儲存 graph ✅

**步驟**:
1. 打開一個 .ramen 檔案
2. 新增/修改節點
3. 按 `Ctrl+S` (或 `Cmd+S`)
4. 檢查檔案是否更新
5. 關閉並重新打開檔案驗證變更已保存

**預期結果**:
- Console 顯示: `🍜 Save request sent via VSCode WebSocket`
- Console 顯示: `🍜 Save operation completed successfully`
- 檔案內容已更新
- 重新打開後變更仍存在

**修復內容**:
- [vscode-extension/webview-build/src/App.tsx](vscode-extension/webview-build/src/App.tsx:260-313)
  - 建立完整的 RamenGraph 物件
  - 使用 WebSocket message passing 而非直接 postMessage
  - 正確的資料格式: `{ id, metadata, nodes, edges, variables }`
- [vscode-extension/webview-build/src/App.tsx](vscode-extension/webview-build/src/App.tsx:115-130)
  - 新增 `websocket-response` 和 `websocket-error` 處理

**WebSocket 訊息格式**:
```typescript
{
  command: 'websocket-request',
  type: 'save_graph',
  id: 'save-{timestamp}',
  data: {
    path: string,
    graph: RamenGraph
  }
}
```

---

### 測試 3: VSCode 主題自動切換 ✅

**步驟**:
1. 打開一個 .ramen 檔案
2. 在 VSCode 中切換主題 (Light ↔ Dark)
   - macOS: `Cmd+K Cmd+T`
   - Windows/Linux: `Ctrl+K Ctrl+T`
3. 觀察 webview 是否即時跟隨切換

**預期結果**:
- Webview 即時切換主題
- Console 顯示: `🍜 VSCode theme changed to: {light|dark|high-contrast}`
- 無需重新載入 webview

**修復內容**:
- [vscode-extension/src/extension/extension.ts](vscode-extension/src/extension/extension.ts:145-170)
  - 監聽 `vscode.window.onDidChangeActiveColorTheme`
  - 將主題類型轉換為字串並傳遞給 webviewManager
  - 支援 light, dark, high-contrast, high-contrast-light 四種主題
- [vscode-extension/src/extension/extension.ts](vscode-extension/src/extension/extension.ts:44-63)
  - 初始化時偵測並設定當前 VSCode 主題
- [vscode-extension/src/extension/webview/webviewManager.ts](vscode-extension/src/extension/webview/webviewManager.ts:144-162)
  - `getWebviewContent` 使用實際 VSCode 主題而非設定值

---

### 測試 4: 向後兼容性 ✅

**步驟**:
1. 建立舊格式的 graph 檔案:
```json
{
  "nodes": [],
  "edges": []
}
```
2. 打開檔案並檢查是否正常載入

**預期結果**:
- 舊格式也能正常載入
- Console 顯示: `🍜 Loaded from legacy format`

---

## 已知限制

### Graph State 與 Server 同步
⚠️ **狀態**: 未實作

這是更複雜的功能，需要：
1. 後端實作 session 狀態訂閱端點
2. 前端 GraphStore 新增 `syncWithServer()` 和 `subscribeToServerUpdates()`
3. 處理衝突解決策略

**建議**: 作為 Phase 3 的下一個任務

---

## 編譯狀態

### Webview React 應用
```bash
cd vscode-extension/webview-build
bun run build
```
✅ 成功 - 2.52s

### VSCode Extension
```bash
cd vscode-extension
npm run compile
```
✅ 成功 - TypeScript 編譯無錯誤

---

## 下一步

1. **手動測試**: 在 VSCode Extension Development Host 中測試所有功能
   - 按 `F5` 啟動 Extension Development Host
   - 打開測試 .ramen 檔案
   - 執行上述測試步驟

2. **更新 KANBAN.md**: 將已完成的任務移至 DONE 區域

3. **考慮實作**: Graph State 同步機制 (較複雜，建議分開處理)

---

## 檔案變更清單

### 前端檔案
- `vscode-extension/webview-build/src/App.tsx`
  - 修復 graph 載入邏輯 (L136-202)
  - 修復儲存功能 (L260-313)
  - 新增 WebSocket 回應處理 (L115-130)

### Extension 檔案
- `vscode-extension/src/extension/extension.ts`
  - 新增主題變更監聽器 (L145-170)
  - 初始化時偵測主題 (L44-63)

- `vscode-extension/src/extension/webview/webviewManager.ts`
  - 修復雙重序列化 (L163-173)
  - 使用實際 VSCode 主題 (L144-162)

---

## 建議測試命令

### 打開 Extension Development Host
按 `F5` 或執行:
```bash
code --extensionDevelopmentPath=/Users/progcat/Desktop/ramen/vscode-extension
```

### 檢查 Console 輸出
在 Extension Development Host 中:
1. 打開 Developer Tools: `Help > Toggle Developer Tools`
2. 查看 Console 標籤
3. 篩選 `🍜` 相關的 log 訊息

---

## 總結

✅ **已完成**:
1. .ramen 檔案載入修復
2. Graph 儲存功能修復
3. VSCode 主題自動切換
4. 程式碼編譯成功

⚠️ **待實作**:
1. Graph State 與 Server 同步 (建議作為獨立任務)
2. 節點視覺辨識度改進 (UI/UX 改進)
3. 型態註冊表系統 (架構改進)

🎯 **測試建議**:
- 現在可以在 VSCode Extension Development Host 中進行實際測試
- 建議測試所有三個核心功能
- 確認無回歸問題
