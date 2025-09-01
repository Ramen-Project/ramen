# KANBAN Board - Ramen Visual Programming

## 專案狀態概覽
- **上次更新**: 2025-08-31 (第三次更新 - Phase 3 開始)
- **當前衝刺**: Git Integration & Version Control for Visual Programming
- **開發方法**: TDD (Test-Driven Development)
- **專案進度**: Phase 1 & 2 完成 ✅ → Phase 3 進行中 🚧

---

## 🔴 TO DO

### 🎯 Git 整合與版本控制 (Phase 3 優先級)
- [ ] **圖形語義化差異比較系統**
  - 實作節點層級的變更檢測
  - 建立圖形結構比較演算法
  - 設計差異視覺化格式

- [ ] **VSCode Git 整合命令**
  - 實作 `ramen.gitDiff` 命令
  - 實作 `ramen.gitMerge` 命令  
  - 整合 VSCode SCM API
  - 建立圖形版本歷史檢視

- [x] **圖形合併衝突解決** ✅ (2025-08-31)
  - 三方合併演算法實作 ✅
  - 衝突檢測與自動解決 ✅
  - REST API 端點 (/git/merge, /git/resolve-conflict) ✅
  - VSCode 視覺化衝突解決介面 ✅
  - 互動式合併指令整合 ✅

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

### Bug 修復
- [ ] **修復 .ramen 檔案仍包含 author/description/created 欄位**
  - VSCode 擴展創建的 .ramen 檔案仍然包含已移除的欄位
  - 需要更新前端序列化邏輯以完全移除這些欄位
  - 確保與後端 schema 一致

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

### 當前數據 (第五次更新 - Phase 3)
- **專案階段**: Phase 3 - Advanced Execution & Usability 🚧
- **當前焦點**: Version History Visualization 🎯
- **Git 整合**: 完整實作完成 ✅
- **其他 Phase 3**: 3 項功能待開發
- **技術債務**: 3 項清理任務
- **整體完成度**: ~75% (Git 整合系統完成)

### Phase 進度
- **Phase 1: Core MVP**: 100% ✅
- **Phase 2: Extensibility & Toppings**: 100% ✅  
- **Phase 3: Advanced Features**: 40% 🚧
- **Git 整合系統**: 100% ✅

### 下一里程碑目標
- **版本歷史視覺化**: 時間線元件設計
- **AOT 編譯系統**: 架構規劃
- **執行資源管理**: 限制機制
- **會話持久化**: 狀態恢復機制

---

*最後更新: 2025-08-31 15:00 (UTC+8) - 第五次更新 - Git 整合系統完成*