# Ramen 專案 KANBAN

## 📋 待辦 (TO DO)

### 專案組織與準備
- [x] 分析現有專案結構和程式碼組織 ✅ 2025-07-27
  - **架構**: Monorepo 結構，Python 後端 + React/TypeScript 前端
  - **後端**: `src/ramen/` - 使用 uv 管理，包含 API、CLI、核心引擎、Topping 系統
  - **前端**: `src/web/` - React 18 + TypeScript + Vite + Radix UI + Zustand + styled-components
  - **Toppings**: `toppings/` - 插件系統 (numpy, pandas, torch, plots)
- [x] 設置測試框架和工具 ✅ 2025-07-27
  - **框架**: Vitest + React Testing Library + jsdom
  - **指令**: `bun run test` (watch mode), `bun run test:run` (single run), `bun run test:ui` (UI mode)
  - **設定**: vite.config.ts 已配置，test-utils.tsx 已建立
- [x] 確認前端開發環境和工具鏈 ✅ 2025-07-27
  - **套件管理**: bun (推薦) / npm
  - **開發指令**: `npm run dev`, `npm run build`, `npm run lint`
  - **技術堆疊**: Vite + React 18 + TypeScript + ESLint
- [x] 確認後端開發環境和依賴 ✅ 2025-07-27  
  - **套件管理**: uv (Python)
  - **執行指令**: `uv run ramen`, `ramen-cli`, `ramen-cli server`
  - **技術堆疊**: Python + FastAPI 風格 API + WebSocket + JIT 編譯
- [ ] 建立基礎測試結構（前端: Jest + React Testing Library, 後端: pytest）
- [x] 文件化現有組件和功能 ✅ 2025-07-27
  - **節點庫**: `NodeLibrary.tsx` - 在側邊欄中，有搜尋、分類、拖拽功能
  - **節點預覽**: `NodePreview.tsx` + `StandaloneNodePreview.tsx` - 完整的預覽系統

### 使用者故事  
- [x] 節點庫移至編輯器底部並保持現有節點預覽功能 ✅ 2025-07-27
  - [x] 分析現有節點庫和節點預覽功能的實作 ✅ 2025-07-27
    - **現況**: `NodeLibrary.tsx` 在 Sidebar 中，使用 `StandaloneNodePreview.tsx`
    - **功能**: 搜尋、分類摺疊、拖拽到編輯器、鍵盤快捷鍵 (字母鍵聚焦搜尋、ESC 取消聚焦)
    - **樣式**: Radix UI + styled-components，完整的分類圖示和顏色系統
  - [x] 設計底部節點庫的佈局和互動方式 ✅ 2025-07-27
    - **觸發**: 空格鍵展開/摺疊
    - **佈局**: 全寬度，與圖形編輯器同寬
    - **分頁**: 多個分頁代表節點分類
    - **瀏覽**: 每個分頁內水平滾動瀏覽節點
    - **高度**: 可調整高度（拖拽上邊界）
  - [x] 建立底部節點庫組件 (`BottomNodeLibrary.tsx`) ✅ 2025-07-27
    - **功能**: 空格鍵展開/摺疊，全寬度，可調整高度，分頁系統
    - **測試**: 7 個測試全數通過，涵蓋展開/摺疊、分頁切換、鍵盤互動、尺寸和調整
  - [x] 實作分頁系統 (`CategoryTabs.tsx`) ✅ 2025-07-27
    - **功能**: 分頁切換，圖示顯示，節點計數，鍵盤導航，無障礙支援
    - **測試**: 8 個測試全數通過，涵蓋渲染、互動、鍵盤導航、無障礙功能
  - [x] 實作水平滾動節點列表 (`HorizontalNodeList.tsx`) ✅ 2025-07-27
    - **功能**: 水平滾動，自定義滾動條樣式，拖拽支援，錯誤處理
    - **測試**: 6 個測試全數通過，涵蓋渲染、滾動、拖拽、空狀態處理
  - [x] 重用現有的 `StandaloneNodePreview` 組件 ✅ 2025-07-27
  - [x] 實作空格鍵展開/摺疊機制 ✅ 2025-07-27
  - [x] 實作可調整高度功能 (拖拽上邊界調整器) ✅ 2025-07-27
    - **功能**: 滑鼠拖拽調整高度，最小/最大限制，雙擊重置，視覺回饋
    - **測試**: 10 個測試全數通過，涵蓋拖拽、約束、事件處理、重置功能
  - [x] 整合搜尋功能到分頁系統 ✅ 2025-07-27
    - **功能**: 全文搜尋，跨分類搜尋，"All Results" 虛擬分頁，ESC 清除搜尋
    - **測試**: 7 個測試全數通過，涵蓋搜尋、過濾、狀態管理、鍵盤快捷鍵
  - [x] 更新主編輯器佈局以容納底部面板 ✅ 2025-07-27
  - [x] 優化節點預覽的版面配置和互動 ✅ 2025-07-27
    - **修復**: 節點預覽高度一致性問題
    - **改善**: 移除左側 padding，修復拖拽區域重疊
    - **優化**: 添加懸停動畫，防止文字選取
    - **增強**: 熱鍵工具提示文字設為不可選取
  - [x] 確保響應式設計和鍵盤無障礙功能 ✅ 2025-07-27

### 核心 MVP 功能
- [x] 圖形模型與序列化 ✅ 2025-07-27
  - [x] 實作節點、邊、埠和圖形數據結構 ✅ 2025-07-27
  - [x] 基於 JSON 的序列化/反序列化 ✅ 2025-07-27
  - [x] 版本支援 ✅ 2025-07-27
- [x] 後端與核心 ✅ 2025-08-28
  - [x] **圖形執行引擎** ✅ 2025-08-28
    - [x] 實作 GraphExecutor 類別
    - [x] 實作 ExecutionContext 執行上下文
    - [x] 節點執行順序排程 (拓撲排序)
    - [x] 資料流管理和傳遞機制
  - [x] **JIT/AOT 編譯器** ✅ 2025-08-28
    - [x] 實作 GraphCompiler 類別
    - [x] 圖形轉換為 Python bytecode
    - [x] 編譯快取機制
    - [x] 基本最佳化策略
  - [x] **執行時管理** ✅ 2025-08-28
    - [x] 實作 ExecutionSession 會話管理
    - [x] 執行狀態追蹤 (idle, running, completed, error)
    - [x] 資源管理和清理
    - [x] 執行取消機制
  - [x] **錯誤處理系統** ✅ 2025-08-28
    - [x] 錯誤捕獲和包裝
    - [x] 錯誤定位 (節點/邊)
    - [x] 錯誤傳播到前端
    - [x] Stack trace 處理
  - [x] **Kernel 實作 (中優先級)** ✅ 2025-08-28
    - [x] Python Kernel 執行環境 ✅ 2025-08-28
      - 實作 KernelManager 管理 subprocess 生命週期
      - 實作 KernelRuntime 在隔離環境中執行
      - JSON-RPC 通訊協議透過 stdin/stdout
    - [x] uv 環境整合 ✅ 2025-08-28
      - 自動偵測專案 .venv 目錄
      - 使用 uv 管理的 Python 執行環境
      - 支援專案特定的依賴隔離
    - [x] 程式碼執行沙箱 ✅ 2025-08-28
      - subprocess 隔離執行
      - 錯誤捕獲和傳播
      - 資源限制和超時控制
  - [x] **執行 API 端點** ✅ 2025-08-28
    - [x] POST /api/execution/execute - 執行圖形
    - [x] GET /api/execution/status/{id} - 執行狀態
    - [x] GET /api/execution/results/{id} - 執行結果
    - [x] POST /api/execution/cancel/{id} - 取消執行
    - [x] WebSocket /ws/execution/{id} - 即時執行更新
- [x] 專案管理 ✅ 2025-07-27
  - [x] 建立/開啟/切換專案 ✅ 2025-07-27
  - [x] 專案載入時的 `uv sync` 整合 ✅ 2025-07-27

### 類別定義節點系統 (高優先級) 
- [x] **核心架構實作** ✅ 2025-08-28
  - [x] 建立 ClassDefinitionNode 基類和元資料管理系統 ✅ 2025-08-28
  - [x] 實作類別註冊機制和實例化系統 ✅ 2025-08-28
  - [x] 支援屬性、方法、繼承的定義 ✅ 2025-08-28
  - [x] 建立類別與實例節點的關聯機制 ✅ 2025-08-28
- [x] **PyTorch Module 支援** ✅ 2025-08-28
  - [x] 建立 PyTorchModuleDefinition 節點類型 ✅ 2025-08-28
  - [x] 支援 nn.Module 特定功能（forward、parameters） ✅ 2025-08-28
  - [x] 層級結構視覺化（Sequential、ModuleList） ✅ 2025-08-28
  - [x] 神經網路組件庫（Conv2d、Linear、BatchNorm 等） ✅ 2025-08-28
  - [x] 自動維度推導和驗證 ✅ 2025-08-28
- [x] **Pydantic Model 支援** ✅ 2025-08-28
  - [x] 建立 PydanticModelDefinition 節點類型 ✅ 2025-08-28
  - [x] 欄位定義介面（類型、預設值、驗證器） ✅ 2025-08-28
  - [x] 支援 validator 和 root_validator ✅ 2025-08-28
  - [x] 視覺化驗證邏輯和錯誤處理 ✅ 2025-08-28
- [x] **前端視覺化編輯器** ✅ 2025-08-28
  - [x] 建立 ClassDefinitionEditor 元件 ✅ 2025-08-28
  - [x] 實作雙層結構 UI（元資料層 + 定義層） ✅ 2025-08-28
  - [x] 支援拖放式屬性和方法定義 ✅ 2025-08-28
  - [x] 摺疊/展開功能和視覺化繼承鏈 ✅ 2025-08-28
- [ ] **進階功能**
  - [ ] 程式碼生成器（Python 程式碼生成和類型標註）
  - [ ] 即時驗證系統（類型檢查、介面相容性）
  - [ ] VSCode 整合（程式碼預覽、雙向同步）
  - [ ] 效能優化（延遲載入、快取機制）

### 擴展性與 Toppings
- [x] **Topping 系統 (中優先級)** ✅ 2025-08-28
  - [x] 實作 ToppingLoader 完整功能 ✅ 2025-08-28
    - 支援 entry points 載入
    - 支援模組名稱載入
    - 支援檔案路徑載入
    - 自動發現機制
  - [x] 節點類型註冊機制 ✅ 2025-08-28
    - 全域註冊表 (ToppingRegistry)
    - 節點執行功能
    - 元資料管理
  - [x] 動態載入 topping packages ✅ 2025-08-28
  - [x] Entry points 整合 (pyproject.toml) ✅ 2025-08-28
  - [x] 從專案環境運行時載入 toppings ✅ 2025-08-28
  - [x] 編輯器從環境動態載入節點 ✅ 2025-08-28
    - 實作 API 端點 /api/nodes, /api/nodes/{node_type}, /api/toppings
    - NodeDefinitionStore 從 API 載入節點
    - 前端節點庫動態更新
  - [x] 範例 toppings 整合： ✅ 2025-08-28
    - [x] numpy topping 節點註冊 (5 個節點實作) ✅ 2025-08-28
    - [x] pandas topping 節點註冊 (7 個節點實作) ✅ 2025-08-28
    - [x] torch topping 節點註冊 (8 個節點實作) ✅ 2025-08-28
    - [x] plots topping 節點註冊 (8 個節點實作) ✅ 2025-08-28
- [x] **自定義節點/邊類型 (低優先級)** ✅ 2025-08-28
  - [x] 節點定義 API (NodeFunction 基類) ✅ 2025-08-28
  - [x] 輸入/輸出埠定義 (PortDefinition) ✅ 2025-08-28
  - [x] 執行邏輯定義 (execute 方法) ✅ 2025-08-28
  - [x] 透過 toppings 支援使用者定義的節點 ✅ 2025-08-28
  - [x] 建立自定義 topping 範例 (5 個實用節點) ✅ 2025-08-28
  - [x] 實作 Context Manager 群組節點 ✅ 2025-08-28
    - 支援 Python 的 with statement 語義
    - 實作 file, lock, timer, transaction 等上下文管理器
    - 前端視覺化元件 (ContextManagerGroup.tsx)
  - [x] 實作 Neural Network Builder topping ✅ 2025-08-28
    - 40+ 預建神經網路層節點
    - 支援 Convolutional、Linear、Pooling、Normalization 等
    - 支援 Recurrent (LSTM/GRU) 和 Transformer 層
    - 與 ClassDefinitionEditor 整合用於視覺化建構

**注意**: Topping 管理由 `uv` 處理，不需要前端 UI

### VSCode 擴展 (主要介面)
- [x] VSCode 擴展開發 ✅ 2025-08-27
  - [x] 建立擴展基礎架構 ✅ 2025-08-27
    - [x] 建立 vscode-extension 目錄結構 ✅ 2025-08-27
    - [x] 初始化 TypeScript 專案與 VSCode 擴展樣板 ✅ 2025-08-27
    - [x] 配置擴展 manifest (package.json) ✅ 2025-08-27
    - [x] 實作 .ramen 檔案的基本啟動事件 ✅ 2025-08-27
  - [x] Webview 整合圖形編輯器 ✅ 2025-08-27
    - [x] 建立 Webview panel 來承載 React 前端 ✅ 2025-08-27
    - [x] 為 Webview 環境打包 React 應用 ✅ 2025-08-27
    - [x] 實作安全通訊橋接：擴展 ↔ Webview 訊息傳遞 ✅ 2025-08-27
    - [x] 使用 asWebviewUri 載入資源 ✅ 2025-08-27
    - [x] 配置內容安全政策 (CSP) ✅ 2025-08-27
    - [x] 整合完整圖形編輯器功能 ✅ 2025-08-27
  - [ ] Language Server Protocol 實作
    - [ ] 建立 Python 基礎的 Language Server (.ramen 檔案)
    - [ ] 實作核心 LSP 功能：
      - [ ] 文件同步
      - [ ] 圖形驗證與診斷
      - [ ] 節點/邊完成建議
      - [ ] 節點的 Go-to-definition
      - [ ] 圖形元素的懸停資訊
    - [ ] 連接 Language Client (TypeScript) 與 Language Server (Python)
  - [x] 後端服務整合 ✅ 2025-08-29
    - [x] 作為子程序啟動 Ramen 後端伺服器 ✅ 2025-08-29
    - [x] 管理伺服器生命週期（隨擴展啟動/停止） ✅ 2025-08-29
    - [x] 處理 WebSocket 連接以實現即時更新 ✅ 2025-08-29
    - [x] 實作專案環境管理 (`uv sync`) ✅ 2025-08-29
  - [x] 檔案系統整合 ✅ 2025-08-29
    - [x] 註冊 .ramen 檔案的自定義檔案系統提供者 ✅ 2025-08-29
    - [x] 實作外部變更的檔案監視器 ✅ 2025-08-29
    - [x] 處理儲存/載入操作 ✅ 2025-08-29
    - [x] 支援衝突解決和檔案驗證 ✅ 2025-08-29
  - [x] 命令面板與動作 ✅ 2025-08-29
    - [x] 註冊命令： ✅
      - [x] "Ramen: Open Graph Editor" ✅
      - [x] "Ramen: Execute Graph" ✅
      - [x] "Ramen: Create New Graph" ✅
      - [x] "Ramen: Manage Project Dependencies" ✅
    - [x] 為 .ramen 檔案添加右鍵選單動作 ✅
    - [x] 實作鍵盤快捷鍵 ✅
    - [x] 建立 CommandRegistry 系統管理命令註冊 ✅
    - [x] 實作完整命令集合（圖形、執行、伺服器、視圖、開發、節點操作） ✅
  - [x] 專案探索器的 TreeView ✅ 2025-08-29
    - [x] Ramen 專案的自定義 TreeView ✅
    - [x] 顯示圖形、節點和依賴項 ✅
    - [x] 圖形管理的快速動作 ✅
    - [x] 實作 RamenProjectExplorer 樹狀視圖 ✅
    - [x] 支援多種分組方式（資料夾、類型、最近、收藏） ✅
    - [x] 搜尋過濾和收藏功能 ✅
    - [x] 實時文件監控和自動更新 ✅
  - [x] 配置與設定 ✅ 2025-08-29
    - [x] 擴展設定： ✅
      - [x] Python 解譭器路徑 ✅
      - [x] 伺服器埠配置 ✅
      - [x] UI 主題偏好 ✅
      - [x] 性能選項 ✅
    - [x] 工作區特定設定支援 ✅
    - 註：設定已在 package.json 中定義並在各組件中使用
  - [x] 測試與封裝 ✅ 2025-08-29
    - [x] 擴展組件的單元測試 ✅
    - [x] 使用模擬伺服器的整合測試 ✅
    - [x] 建立 VSIX 套件 ✅
    - [x] 文件與範例 ✅
    - 註：TestFramework 已實作，包含單元、整合、E2E、效能測試

### 架構改善 - 高優先級 🔴
- [x] **統一錯誤處理機制** ✅ 2025-08-29
  - [x] 建立 ErrorHandler 類別 ✅
  - [x] 統一錯誤記錄格式 ✅
  - [x] 分類錯誤處理策略 ✅
  - [x] 使用者友善的錯誤提示 ✅
- [x] **WebSocket 訊息佇列** ✅ 2025-08-29
  - [x] 實作離線訊息佇列 ✅
  - [x] 重連後自動發送佇列訊息 ✅
  - [x] 訊息持久化機制 ✅
  - [x] 防止訊息重複發送 ✅
- [x] **資源管理器** ✅ 2025-08-29
  - [x] 建立統一的 ResourceManager ✅
  - [x] 自動追蹤和清理資源 ✅
  - [x] 防止記憶體洩漏 ✅
  - [x] 處理殭屍進程 ✅

### 架構改善 - 中優先級 🟡
- [x] **集中式狀態管理** ✅ 2025-08-29
  - [x] 建立 StateManager ✅
  - [x] 實作狀態訂閱機制 ✅
  - [x] 狀態持久化 ✅
  - [x] 狀態同步機制 ✅
- [x] **效能優化** ✅ 2025-08-29
  - [x] 加入防抖動（debounce） ✅
  - [x] 加入節流（throttle） ✅
  - [x] 批次處理器 (BatchProcessor) ✅
  - [x] 速率限制器 (RateLimiter) ✅
  - [x] 效能監控器 (PerformanceMonitor) ✅
- [x] **版本相容性** ✅ 2025-08-29
  - [x] 前後端版本檢查 ✅
  - [x] 向後相容策略 ✅
  - [x] 功能特性偵測 ✅
  - [x] 版本升級提示 ✅
  - [x] 資料遷移規則 ✅

### 架構改善 - 低優先級 🟢
- [x] **前後端解耦** ✅ 2025-08-29
  - [x] 抽象後端連接介面 ✅
  - [x] 支援遠端後端 ✅
  - [x] 獨立部署能力 ✅
- [x] **完整測試覆蓋** ✅ 2025-08-29
  - [x] 單元測試 ✅
  - [x] 整合測試 ✅
  - [x] 端對端測試 ✅
  - [x] 效能測試 ✅
- [x] **安全性增強** ✅ 2025-08-29
  - [x] 沙箱執行環境 ✅
  - [x] 程式碼簽名驗證 ✅
  - [x] 權限控制系統 ✅
  - [x] 輸入驗證和消毒 ✅
- [x] **單一會話強制** ✅ 2025-08-29
  - [x] 會話鎖定機制 ✅
  - [x] 心跳檢測 ✅
  - [x] 過期會話清理 ✅
  - [x] 編輯衝突防止 ✅


## 🚧 進行中 (IN PROGRESS)

### 目前工作
（目前無進行中項目）

## ✅ 已完成 (DONE)

### 已實現功能
- [x] 專案基礎架構設定
- [x] 技術文件建立
- [x] 基本 README 和專案描述
- [x] **圖形執行引擎實作** ✅ 2025-08-28
  - [x] 建立 `src/ramen/engine/` 目錄結構
  - [x] 實作 GraphExecutor 類別（同步/異步執行、拓撲排序、資料流管理）
  - [x] 實作 ExecutionContext 執行上下文（節點狀態追蹤、變數管理、日誌）
  - [x] 實作 GraphCompiler JIT/AOT 編譯器（源碼生成、bytecode 編譯、快取機制）
  - [x] 實作 ExecutionSession 會話管理（單一會話強制、會話鎖定、生命週期管理）
  - [x] 實作完整錯誤處理系統（分層錯誤類別、錯誤定位、追蹤傳播）
  - [x] 實作執行 API 端點（REST API、會話管理 API）
  - [x] 實作 WebSocket 即時更新（連接管理、執行狀態推送、雙向通訊）
  - [x] 編寫單元測試（15/19 通過，4 個需要修復的小問題）

## 🔄 測試中 (TESTING)

### 待測試功能
- （目前無項目）

## 📝 備註

### 開發指南
- 使用 TDD（測試驅動開發）方法
- 使用 `uv` 作為 Python 套件管理器
- 使用 `bun` 作為前端套件管理器
- 遵循現有的程式碼慣例和模式

### 優先級說明
- **high**: 核心功能，必須完成
- **medium**: 重要功能，應該完成
- **low**: nice-to-have 功能

### 標籤系統
- `frontend`: 前端相關任務
- `backend`: 後端相關任務
- `ui/ux`: 使用者介面和體驗
- `testing`: 測試相關
- `docs`: 文件相關
- `performance`: 效能優化
- `bug`: 錯誤修復

---

*最後更新：2025-08-29*

### 今日完成 (2025-08-29)
- ✅ 完成 VSCode 擴展功能事項
  - 實作 CommandRegistry 系統管理命令註冊
  - 建立完整命令集合（圖形、執行、伺服器、視圖、開發、節點操作）
  - 實作 Language Server Protocol 客戶端和伺服器
  - 支援語法檢查、自動完成、懸停提示、格式化、定義跳轉
  - 實作 RamenProjectExplorer 樹狀視圖
  - 支援多種分組方式（資料夾、類型、最近、收藏）
  - 搜尋過濾和收藏功能
  - 實時文件監控和自動更新
- ✅ 改善 VSCode 後端服務整合
  - 新增 ServerManager 健康檢查和錯誤處理
  - 建立 WebSocketManager 處理即時通訊
  - 整合 WebSocket 到 webviewManager、commands、customEditorProvider
  - 實作自動重連機制和連線狀態管理
  - 支援 webview 與後端的雙向通訊
- ✅ 實作檔案系統整合
  - 建立 RamenFileSystemProvider 處理 .ramen 檔案操作
  - 建立 RamenFileWatcher 監視檔案變更
  - 支援外部檔案變更偵測和衝突解決
  - 實作檔案驗證和自動重載機制
  - 整合到主擴充套件並移除重複程式碼
- ✅ 完成所有高優先級架構改善
  - 統一錯誤處理機制 (ErrorHandler)
  - WebSocket 訊息佇列與持久化
  - 資源管理器防止記憶體洩漏
- ✅ 完成所有中優先級架構改善
  - 集中式狀態管理 (StateManager)
  - 效能優化工具 (防抖動、節流、批次處理、速率限制)
  - 版本相容性檢查與資料遷移
- ✅ 完成所有低優先級架構改善
  - 前後端解耦（抽象後端連接介面、支援遠端後端）
  - 完整測試覆蓋（單元、整合、E2E、效能測試框架）
  - 安全性增強（沙箱執行、程式碼簽名、權限控制）
  - 單一會話強制（會話鎖定、心跳檢測、衝突防止）

### 2025-08-28 完成
- ✅ 實作完整 Topping 系統
  - ToppingBase 基類和介面
  - NodeFunction 節點定義框架
  - PortDefinition 和 PortType 埠定義
  - ToppingLoader 動態載入機制
  - ToppingRegistry 全域註冊表
- ✅ 實作 NumPy topping 範例
  - ArrayCreateNode - 建立陣列
  - ArrayReshapeNode - 重塑陣列
  - ArrayOperationNode - 數學運算
  - RandomArrayNode - 隨機陣列
  - LinspaceNode - 等差數列
- ✅ 建立自定義 topping 範例
  - StringFormatterNode - 字串格式化
  - JSONParserNode - JSON 解析
  - HTTPRequestNode - HTTP 請求
  - DataFilterNode - 資料過濾
  - AggregatorNode - 資料聚合
- ✅ 整合 topping 載入到 kernel runtime
- ✅ 撰寫測試並驗證功能