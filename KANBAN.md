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
- [ ] 圖形模型與序列化
  - [ ] 實作節點、邊、埠和圖形數據結構
  - [ ] 基於 JSON 的序列化/反序列化
  - [ ] 版本支援
- [ ] 基礎前端
  - [ ] 節點式圖形編輯器（新增、移動、連接節點）
  - [ ] 專案開啟/儲存（本地）
  - [ ] 基本 UI/UX 美化
- [ ] 後端與核心
  - [ ] 圖形解析和記憶體內表示
  - [ ] JIT 編譯為 Python 位元組碼
  - [ ] uv 管理環境中的執行引擎
  - [ ] 錯誤傳播到前端
- [ ] 專案管理
  - [ ] 建立/開啟/切換專案
  - [ ] 專案載入時的 `uv sync` 整合
- [ ] 單一會話強制執行
  - [ ] 每個圖形只能有一個會話，具有會話接管提示

### 擴展性與 Toppings
- [ ] Topping 系統
  - [ ] 註冊新節點/邊類型的插件 API
  - [ ] 從專案環境運行時載入 toppings
  - [ ] 範例 toppings：numpy、pandas、torch、plots
- [ ] 自定義節點/邊類型
  - [ ] 透過 toppings 支援使用者定義的節點/邊

**注意**: Topping 管理由 `uv` 處理，不需要前端 UI

### 其他功能
- [ ] VSCode 擴展開發

## 🚧 進行中 (IN PROGRESS)

### 目前工作
- [ ] 建立 KANBAN.md 檔案以管理專案任務

## ✅ 已完成 (DONE)

### 已實現功能
- [x] 專案基礎架構設定
- [x] 技術文件建立
- [x] 基本 README 和專案描述

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

*最後更新：2025-07-27*