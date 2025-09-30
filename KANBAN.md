# KANBAN Board - Ramen Visual Programming

## 專案狀態概覽
- **上次更新**: 2025-10-01 (第六次更新 - 核心功能修復)
- **當前衝刺**: Core UX & Type System Improvements
- **開發方法**: TDD (Test-Driven Development)
- **專案進度**: Phase 1 & 2 完成 ✅ → Phase 3 進行中 🚧

---

## 🔴 TO DO

### 🎯 Git 整合修復 (Phase 3 優先級)

- [ ] **🔴 Git 整合無法運作（架構存在但連接失敗）**
  - 優先級: 🔴 極高（功能已實作但無法使用）
  - 相關檔案: `vscode-extension/src/extension/commands/gitCommands.ts`
  - 問題描述:
    - ✅ 後端已實作: `diff.py` (358行), `merge.py` (567行)
    - ✅ 前端已實作: `gitCommands.ts` (915行)
    - ❌ Port 不一致: 使用 `localhost:9001` 但 server 在 `8000`
    - ❌ 使用過時的 HTTP fetch，應改用 WebSocket
    - ❌ 未使用 serverManager 取得正確 URL
  - 需要修復:
    1. 改用 WebSocket API 而非 HTTP fetch
    2. 從 serverManager 取得 backend URL
    3. 使用 `MessageType.GIT_DIFF`, `GIT_MERGE` 等
    4. 更新錯誤處理機制
    5. 測試完整 Git 整合流程

- [ ] **🟠 Git 整合 WebSocket API 端點測試不足**
  - 優先級: 🟠 高（穩定性問題）
  - WebSocket handler 已實作但缺少端到端測試
  - 需要測試:
    - `GIT_DIFF` message flow
    - `GIT_MERGE` three-way merge
    - `GIT_RESOLVE_CONFLICT` conflict resolution
    - `GIT_VALIDATE`, `GIT_HISTORY`, `GIT_BRANCHES`

- [ ] **版本歷史視覺化**
  - 圖形演進時間線
  - 節點變更追蹤
  - 分支合併視覺化

### 🆕 新功能：前端元件隨套件分發 (Phase 3 新增)
- [ ] **前端元件與 Topping 整合架構**
  - 設計套件內前端元件的目錄結構
  - 建立元件探索和載入機制
  - 實作 React 元件動態載入系統

- [ ] **Topping 套件前端元件支援**
  - 擴展 ToppingBase API 支援前端元件
  - 建立元件 manifest 和元數據系統
  - 實作元件版本管理和相依性處理

- [ ] **範例實作與測試**
  - 建立包含前端元件的範例 topping
  - 實作互動式資料視覺化節點
  - 端到端測試和文件撰寫

### 其他 Phase 3 功能
- [ ] AOT 編譯與快取系統
- [ ] 執行資源管理與限制
- [ ] 會話持久化機制

### 技術債務清理
- [ ] 移除未使用的程式碼
- [ ] 完善測試覆蓋率到 95%+
- [ ] 最佳化大型圖形處理效能

### 🐛 核心功能 Bug 修復 (高優先級)

- [ ] **🔴 [CRITICAL] 打開 .ramen 檔不會看到 graph**
  - 優先級: 🔴 極高（核心功能失效）
  - 相關檔案: `vscode-extension/src/extension/providers/customEditorProvider.ts`
  - 問題: 使用者無法查看圖形內容
  - 影響: 阻止基本使用流程
  - 需要檢查: CustomEditorProvider 的載入邏輯、webview 初始化

- [ ] **🔴 [CRITICAL] 無法儲存 graph**
  - 優先級: 🔴 極高（核心功能失效）
  - 相關檔案: `vscode-extension/src/extension/providers/customEditorProvider.ts`
  - 問題: 編輯後無法儲存檔案
  - 影響: 資料丟失風險
  - 需要實作: CustomDocument save/saveAs 方法

- [ ] **🔴 [CRITICAL] Webview 上的 graph state 不會跟 server 同步**
  - 優先級: 🔴 極高（資料一致性問題）
  - 相關檔案: `vscode-extension/webview-build/src/stores/GraphStore.ts`, `apiClient.ts`
  - 問題: 前端狀態與後端 session 不同步
  - 影響: 可能導致資料不一致或丟失
  - 需要實作:
    - WebSocket 訂閱機制
    - GraphStore 與 server session 雙向同步
    - 衝突解決策略

### 🎨 UX/UI 改進 (高優先級)

- [ ] **🟠 Webview 沒有根據 VSCode 主題自動切換（light/dark mode）**
  - 優先級: 🟠 高（使用者體驗）
  - 相關檔案: `vscode-extension/src/extension/webview/webviewManager.ts`, `vscode-extension/webview-build/src/App.tsx`
  - 問題: Webview 不會跟隨 VSCode 主題變化
  - 現狀: 有 `updateTheme()` 方法但未自動監聽
  - 需要實作:
    - 監聽 `vscode.window.onDidChangeActiveColorTheme`
    - 透過 postMessage 傳遞主題資訊到 webview
    - Webview 接收並應用主題

- [ ] **🟠 所有節點清一色是一個模版，缺乏辨識度**
  - 優先級: 🟠 高（使用者體驗）
  - 相關檔案: `vscode-extension/webview-build/src/components/Node/`
  - 問題: 變數 getter/setter、flow control、type conversion 節點應該有專屬設計
  - 現狀: 所有節點使用 OperatorNode 模版
  - 需要實作:
    - VariableGetterNode / VariableSetterNode 獨特視覺設計
    - FlowControlNode (if/while/for) 獨特外觀
    - TypeConversionNode 專屬樣式
    - 參考 OperatorNode 風格但增加辨識度

### 🏗️ 架構改進 (中優先級)

- [ ] **🟡 沒有完整的型態註冊表系統**
  - 優先級: 🟡 中（擴展性問題）
  - 相關檔案: `vscode-extension/webview-build/src/stores/TypeStore.ts`, `src/ramen/registry/type_registry.py`
  - 問題: Toppings 提供的新型態無法被管理和正確渲染
  - 現狀: 基礎 TypeStore 存在但功能不完整
  - 需要實作:
    - 後端型態註冊表 API (`/types/register`, `/types/list`)
    - 前端 TypeStore 動態載入機制
    - 型態視覺化配置（顏色、圖標、驗證規則）
    - Topping 型態自動發現和註冊
    - 型態相容性檢查機制

### 💀 空殼功能 - CRITICAL (極高優先級)

- [ ] **🔴 [CRITICAL] UV Package Manager 完全是空殼**
  - 優先級: 🔴 極高（核心依賴管理缺失）
  - 檔案: `src/ramen/uv_wrapper.py:3-4`
  - 程式碼: `class UVPackageManager(Singleton): pass`
  - 影響: Python 依賴隔離、Topping 安裝、環境管理完全無法運作
  - 需要實作:
    - `uv venv` 虛擬環境管理
    - `uv add/remove` 套件安裝/移除
    - `uv pip install` pip 整合
    - 套件版本鎖定和解析

- [ ] **🔴 [CRITICAL] Graph Export to Python 只有空殼**
  - 優先級: 🔴 極高（宣傳功能但無作用）
  - 檔案: `vscode-extension/src/extension/commands/ramenCommands.ts:188-194`
  - 問題: 只產生 placeholder Python 檔案，沒有實際編譯
  - 影響: 無法將圖形導出為獨立 Python 腳本
  - 需要實作:
    - 呼叫 GraphCompiler 編譯圖形
    - 產生可執行的 Python 程式碼
    - 包含必要的 imports 和依賴

- [ ] **🔴 [CRITICAL] 核心 Graph 架構類別是空殼**
  - 優先級: 🔴 極高（架構決策未完成）
  - 檔案: `src/ramen/core/graph.py`, `procedural_graph.py`, `modal_graph.py`, `module.py`, `package.py`
  - 問題: ProceduralGraph, ModalGraph, Module, Package 只有 type hints
  - 決策需要:
    - 是否實作這些進階架構？
    - 或移除並簡化為單一 RamenGraph？
  - 建議: **移除或標記為 Future Work**

### 💀 空殼功能 - HIGH (高優先級)

- [ ] **🟠 Language Server 驗證邏輯不回報錯誤**
  - 優先級: 🟠 高（功能存在但無作用）
  - 檔案: `vscode-extension/src/language-server/server.py:266-302`
  - 問題: 檢測到錯誤但所有 `pass` 語句，從不產生 diagnostics
  - 影響: VSCode 中無即時錯誤提示
  - 需要實作:
    - 產生 Diagnostic 物件
    - 回報給 LSP client
    - 顯示錯誤波浪線和訊息

- [ ] **🟠 Git Merge 無法套用變更**
  - 優先級: 🟠 高（框架存在但核心缺失）
  - 檔案: `src/ramen/git/merge.py:495-529`
  - 問題: `_apply_diff_to_graph()` 和 `_apply_conflict_resolution()` 都是 `pass`
  - 影響: 可以檢測衝突但無法實際合併
  - 需要實作:
    - 反序列化節點/邊數據
    - 套用變更到圖形
    - 更新衝突解決結果

- [ ] **🟡 Security Manager 需要精簡為權限管理**
  - 優先級: 🟡 中（重構需求）
  - 檔案: `vscode-extension/src/extension/security/securityManager.ts` (507 行)
  - 問題: 包含大量未使用功能（sandbox, code signing）
  - 決策: **只保留權限管理功能**
  - 需要重構:
    - ✅ 保留: `grantPermissions()`, `revokePermissions()`, 權限相關邏輯
    - ❌ 移除: `createSandbox()`, `executeInSandbox()` (圖形在 Python 執行)
    - ❌ 移除: `signCode()`, `verifyCodeSignature()` (無使用場景)
    - ❌ 移除: `isTrustedSource()`, `addTrustedSource()` (無使用場景)
    - ❌ 移除: Placeholder keys (不需要)
  - 精簡後預計: ~150 行（僅權限管理 + 審計日誌）

- [ ] **🟠 Project Management APIs 完全未實作**
  - 優先級: 🟠 高（API 宣告但無後端）
  - 檔案: `vscode-extension/webview-build/src/services/apiClient.ts:227-267`
  - 問題: createProject, loadProject, saveProject 等全回傳錯誤
  - 影響: 多圖形專案管理無法使用
  - 需要實作:
    - 後端 WebSocket handlers
    - 專案檔案格式定義
    - 專案持久化邏輯

- [ ] **🟠 整合測試和 E2E 測試都是 placeholder**
  - 優先級: 🟠 高（測試覆蓋假象）
  - 檔案: `vscode-extension/src/test/testFramework.ts:105-156`
  - 問題: 測試總是通過（`assert.ok(true, 'placeholder')`）
  - 影響: 沒有真實的整合測試
  - 需要實作:
    - WebSocket 測試（需 mock server）
    - E2E graph creation/save 測試
    - E2E graph execution 測試

### 💀 空殼功能 - MEDIUM (中優先級)

- [ ] **🟡 Interactive Node WebSocket State Sync 是空殼**
  - 檔案: `src/ramen/topping/topping_base.py:156-159`
  - 問題: `_sync_state_to_frontend()` 只有 `pass` 和 TODO

- [ ] **🟡 Compiler Optimizations 只有基礎實作**
  - 檔案: `src/ramen/engine/compiler.py:318-322`
  - 問題: 死代碼消除等進階優化未實作

- [ ] **🟡 Semver 使用 stub 實作**
  - 檔案: `vscode-extension/src/extension/core/versionManager.ts:571-594`
  - 問題: `satisfies()` 總是回傳 true，版本比較不正確

- [ ] **🟡 Graph Editor - Connection Validation 不完整**
  - 檔案: `vscode-extension/webview-build/src/components/GraphEditor/Graph.tsx:151-152`
  - TODOs: 防止變數 getter/setter 直接連接、自動插入 type caster

- [ ] **🟡 History Tracking - Move Operations 缺少 Delta**
  - 檔案: `vscode-extension/webview-build/src/components/GraphEditor/Graph.tsx` (多處)
  - 問題: 群組移動、多節點移動、單節點移動都沒有正確的 delta tracking

- [ ] **🟡 Error Telemetry 未實作**
  - 檔案: `vscode-extension/src/extension/core/errorHandler.ts:382-387`
  - 問題: `reportTelemetry()` 是空函數

- [ ] **🟡 Edge Rendering 需要改進**
  - 檔案: `vscode-extension/webview-build/src/components/Edges.tsx`
  - TODOs: 根據類型設定顏色、label 永遠顯示、hover 顯示

### Bug 修復 (低優先級)

- [ ] **修復 .ramen 檔案仍包含 author/description/created 欄位**
  - VSCode 擴展創建的 .ramen 檔案仍然包含已移除的欄位
  - 需要更新前端序列化邏輯以完全移除這些欄位
  - 確保與後端 schema 一致

- [ ] **Debug 設定 hardcoded**
  - 檔案: `src/ramen/engine/session.py:197`
  - 問題: `debug=True` 應該從設定讀取

---

## 🟡 IN PROGRESS

### 當前進行中 - Phase 3 進階功能
- [ ] **[ACTIVE]** 版本歷史視覺化系統開發
  - 時間線視覺化元件 ✅ (2025-08-31)
  - 節點變更追蹤機制 🚧
  - 分支合併視覺化 🔄

### 準備開始
- [ ] AOT 編譯系統架構設計

---

## 🟢 TESTING

### 等待驗證
- [ ] TypeScript 編譯修正驗證
- [ ] Python CLI 功能測試
- [ ] VSCode 擴充功能基礎建置測試

---

## ✅ DONE

### Phase 3 Git 整合完成 (第五次更新 - 2025-08-31)

- [x] **Git 整合與版本控制** (2025-08-31)
  - 語義化差異比較系統 ✅
  - 節點層級變更檢測演算法 ✅
  - VSCode Git 整合命令 (diff, status, log, merge) ✅
  - REST API 後端支援 (/git/diff, /git/merge, /git/resolve-conflict) ✅
  - HTML webview 視覺化差異檢視 ✅
  - 三方合併衝突解決系統 ✅
  - 視覺化衝突解決介面 ✅
  - 完整單元測試覆蓋 (27/27 通過) ✅
  - 使用示例和文件 ✅

### Phase 3 準備工作 (第三次更新 - 2025-08-31)

- [x] **專案階段轉換** (2025-08-31)
  - 更新 Roadmap 反映實際進度 ✅
  - Phase 1 & 2 標記為完成 ✅
  - Phase 3 Git 整合設為當前優先級 ✅
  - KANBAN 與 Roadmap 同步 ✅

- [x] **圖形 Schema 清理** (2025-08-31)
  - 移除 GraphMetadata 中不必要欄位 (tags, author, timestamps) ✅
  - 移除 TypeInfo 中的 validator 欄位 ✅
  - 精簡 schema 以利版本控制 ✅
  - 前後端類型定義同步 ✅

- [x] **節點庫類別系統優化** (2025-08-31)
  - 分析現有類別結構（40+ 子類別） ✅
  - 實作智能類別合併邏輯 ✅
  - 更新前端 TypeScript 類別映射 ✅
  - 自動合併子類別到 9 個主類別 ✅
  - 移除 ML 類別節點（173 個節點保留） ✅
  - 節點圖標改用套件圖標系統 ✅
  - 完全移除外部 topping 載入錯誤 ✅
  - 系統輕量化，純內建節點運行 ✅
  - 保持類別順序一致性 ✅

### Phase 2 完成里程碑

- [x] **Topping 架構遷移完成** (2025-01-01)
  - 196+ 個內建節點遷移至新 API ✅
  - 模組化 toppings: numpy, pandas, torch, plots, nn-builder ✅
  - ToppingBase API 穩定運行 ✅
  - 獨立套件發布準備就緒 ✅

### Phase 1 完成里程碑

- [x] **核心系統建立** (2024-12-01)
  - VSCode 擴展完整功能 ✅
  - 圖形執行引擎穩定運行 ✅
  - WebSocket 實時通訊 ✅
  - 會話管理與衝突處理 ✅

### 代碼品質改善 (已完成)

- [x] **TypeScript 代碼品質大幅改善** (2025-08-30)
  - ESLint 錯誤從 166 減至 129 個 (↓22%) ✅
  - 消除大部分 `any` 類型使用 ✅
  - 所有編譯錯誤修復 ✅

- [x] **測試基礎設施建立** (2025-08-30)
  - Vitest + React Testing Library 設置 ✅
  - 95 個測試通過 (87% 通過率) ✅
  - VSCode API mocking 完成 ✅

---

## 📝 技術債務

### 需要重構的項目
- [ ] 統一錯誤處理機制
- [ ] 改善測試覆蓋率
- [ ] 優化模組間相依性
- [ ] 完善 API 文件

### 效能優化
- [ ] Webview 載入速度優化  
- [ ] 大型圖形處理效能
- [ ] 記憶體使用最佳化

---

## 🔄 流程提醒

### TDD 流程
1. **Red**: 撰寫失敗的測試
2. **Green**: 實作最小可行代碼使測試通過  
3. **Refactor**: 重構代碼保持測試通過

### 任務狀態轉換
```
TO DO → IN PROGRESS → TESTING → DONE
```

### 提交前檢查清單
- [ ] 所有測試通過
- [ ] 執行 linter 檢查
- [ ] 更新 KANBAN 狀態
- [ ] 撰寫提交訊息

---

## 📊 專案指標

### 當前數據 (第六次更新 - 2025-10-01)
- **專案階段**: Phase 3 - Advanced Execution & Usability 🚧
- **當前焦點**: Core UX & Skeleton Implementation 修復 🎯
- **嚴重問題發現**:
  - 🔴 CRITICAL 空殼: 7 個（UV, Export, Graph架構等）
  - 🔴 CRITICAL bugs: 4 個（打開/儲存/同步/Git）
  - 🟠 HIGH 空殼: 5 個（LSP, Git Merge, Security等）
  - 🟡 MEDIUM 空殼: 7 個（各種優化和改進）
- **Git 整合**: 架構完整但連接失敗 ⚠️ + 合併無法套用
- **整體完成度**: ~60% (發現大量空殼實作)

### Phase 進度
- **Phase 1: Core MVP**: 100% ✅
- **Phase 2: Extensibility & Toppings**: 100% ✅  
- **Phase 3: Advanced Features**: 40% 🚧
- **Git 整合系統**: 100% ✅

### 下一里程碑目標 (優先級排序)

**🔴 當前衝刺 (Sprint 6)**: 核心功能修復
1. 🔴 打開 .ramen 檔顯示 graph
2. 🔴 實作 graph 儲存功能
3. 🔴 Graph state 與 server 同步
4. 🔴 修復 Git 整合（改用 WebSocket）
5. 🎨 VSCode 主題自動切換
6. 🎨 節點視覺辨識度改進

**🟡 下個衝刺 (Sprint 7)**: 型態系統與擴展性
- 完整型態註冊表系統
- Topping 型態自動發現
- 型態視覺化配置

**⚪ 未來規劃**: 進階功能
- 版本歷史視覺化
- AOT 編譯系統
- 執行資源管理
- 會話持久化

---

*最後更新: 2025-10-01 02:30 (UTC+8) - 第六次更新 - 核心功能問題識別*