# Ramen Claude Code Agents

這個目錄包含 Ramen 專案的 Claude Code subagents 配置。每個 agent 都是專門為特定開發任務設計的 AI 助理，具有獨立的上下文和專業領域。

## 🎯 Agent 總覽

Ramen 專案配置了 **8 個專門的協作 agents**，涵蓋開發流程的各個方面：

### 1. 🏗️ [topping-architect](topping-architect.md)
**Topping 系統架構專家**

- **專長**: ToppingBase API、NodeFunction 設計、entry points 配置
- **適用場景**: 創建新 topping、遷移節點 API、審查 topping 程式碼
- **工具**: Read, Write, Edit, Grep, Glob, Bash(uv)

### 2. 📦 [vscode-extension-specialist](vscode-extension-specialist.md)
**VSCode Extension 開發專家**

- **專長**: Extension API、Custom Editor Provider、Webview 通訊
- **適用場景**: VSCode 整合、命令註冊、backend 整合、主題支援
- **工具**: Read, Write, Edit, Grep, Glob, Bash(npm, bun)

### 3. ⚛️ [react-webview-engineer](react-webview-engineer.md)
**React Webview UI 專家**

- **專長**: React、@xyflow/react、Zustand、Radix UI
- **適用場景**: 圖形編輯器開發、節點視覺化、狀態管理、UI 元件
- **工具**: Read, Write, Edit, Grep, Glob, Bash(bun)

### 4. 🐍 [python-backend-specialist](python-backend-specialist.md)
**Python Backend 專家**

- **專長**: FastAPI、WebSocket、圖形編譯引擎、執行管理
- **適用場景**: API 開發、編譯器優化、session 管理、topping 整合
- **工具**: Read, Write, Edit, Grep, Glob, Bash(uv)

### 5. 🧪 [tdd-test-engineer](tdd-test-engineer.md)
**TDD 測試工程師**

- **專長**: Vitest、React Testing Library、pytest、端對端測試
- **適用場景**: TDD 開發流程、測試撰寫、測試覆蓋率提升
- **工具**: Read, Write, Edit, Grep, Glob, Bash(bun test, pytest)

### 6. 🔧 [shell-feature-implementor](shell-feature-implementor.md)
**空殼功能實作者**

- **專長**: 快速實作 TODO、pass 語句、placeholder 功能
- **適用場景**: 處理 KANBAN 空殼項目、填補缺失邏輯
- **工具**: Read, Write, Edit, Grep, Glob, Task

### 7. 🔍 [code-archeologist](code-archeologist.md)
**程式碼考古學家**

- **專長**: 程式碼搜尋、架構分析、技術債務識別
- **適用場景**: 搜尋 API 使用、分析依賴、識別重構機會
- **工具**: Read, Grep, Glob, Task

### 8. 📊 [kanban-project-manager](kanban-project-manager.md)
**KANBAN 專案管理者**

- **專長**: 任務優先級、Sprint 規劃、技術債務追蹤
- **適用場景**: KANBAN 維護、進度追蹤、優先級評估
- **工具**: Read, Write, Edit

## 🔄 Agent 協作模式

### 協作場景範例

#### 場景 1: 新增 Topping 功能
```
User 提出需求
  ↓
kanban-project-manager 評估優先級並記錄
  ↓
topping-architect 設計架構
  ↓
tdd-test-engineer 撰寫測試（Red）
  ↓
python-backend-specialist 實作後端
  ↓
tdd-test-engineer 驗證測試通過（Green）
  ↓
vscode-extension-specialist 前端整合
  ↓
react-webview-engineer UI 元件開發
  ↓
kanban-project-manager 更新狀態為 DONE
```

#### 場景 2: 修復空殼功能
```
code-archeologist 搜尋空殼功能
  ↓
kanban-project-manager 建立任務並排優先級
  ↓
shell-feature-implementor 分析並實作
  ↓
tdd-test-engineer 撰寫測試驗證
  ↓
kanban-project-manager 標記為完成
```

#### 場景 3: UI 改進
```
User 提出 UI 需求
  ↓
react-webview-engineer 設計元件
  ↓
tdd-test-engineer 撰寫元件測試
  ↓
vscode-extension-specialist 整合 VSCode 主題
  ↓
tdd-test-engineer 驗證測試
  ↓
kanban-project-manager 更新進度
```

#### 場景 4: 技術債務清理
```
kanban-project-manager 啟動技術債務評估
  ↓
code-archeologist 搜尋並分析技術債務
  ↓
kanban-project-manager 建立優先級清單
  ↓
shell-feature-implementor 實作高優先級項目
  ↓
對應專業 agent 協助複雜實作
  ↓
tdd-test-engineer 確保測試覆蓋
  ↓
kanban-project-manager 追蹤完成進度
```

## 🚀 如何使用 Agents

### 方式 1: 直接呼叫（在對話中）
在 Claude Code 中輸入：
```
/agents
```
然後選擇要使用的 agent。

### 方式 2: 自然語言觸發
描述你的需求，Claude Code 會自動判斷並使用合適的 agent。

範例：
- "幫我搜尋所有空殼功能" → 自動使用 `code-archeologist`
- "這個 topping 的架構需要改進" → 自動使用 `topping-architect`
- "更新 KANBAN，這個任務完成了" → 自動使用 `kanban-project-manager`

### 方式 3: 明確請求
```
請使用 tdd-test-engineer agent 為這個功能撰寫測試
```

## 📋 Agent 選擇指南

**何時使用哪個 agent？**

| 任務類型 | 推薦 Agent | 原因 |
|---------|-----------|------|
| 創建新 topping | topping-architect | 專精 topping 架構設計 |
| VSCode 命令整合 | vscode-extension-specialist | 熟悉 VSCode Extension API |
| 圖形編輯器 UI | react-webview-engineer | 專精 React Flow 和 Zustand |
| WebSocket API | python-backend-specialist | 專精 FastAPI 和 async |
| 撰寫測試 | tdd-test-engineer | 專精 TDD 流程 |
| 實作空殼功能 | shell-feature-implementor | 快速填補缺失邏輯 |
| 搜尋程式碼 | code-archeologist | 專精程式碼搜尋和分析 |
| 規劃 Sprint | kanban-project-manager | 專精專案管理 |

## 🎓 Agent 設計原則

所有 agents 都遵循以下設計原則：

1. **專業化分工**: 每個 agent 專注於特定領域
2. **獨立上下文**: 各自維護獨立的對話上下文
3. **協作友好**: 設計時考慮與其他 agents 的協作
4. **文檔完整**: 每個 agent 都有清晰的職責和使用指南
5. **工具權限**: 只給予必要的工具存取權限

## 🔧 Agent 配置說明

每個 agent 的配置檔案包含：

```yaml
---
name: agent-name                    # Agent 識別名稱
description: "簡短描述"              # Agent 功能摘要
tools:                              # 可用工具清單
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Task
model: claude-sonnet-4-5-20250929   # 使用的模型
---
```

## 📚 延伸閱讀

- [Claude Code Subagents 官方文檔](https://docs.claude.com/en/docs/claude-code/sub-agents.md)
- [Ramen CLAUDE.md](../CLAUDE.md) - 專案整體指引
- [Ramen KANBAN.md](../KANBAN.md) - 任務追蹤看板
- [Ramen Roadmap](../docs/technical-design/Roadmap.md) - 專案路線圖

## 💡 貢獻新 Agent

如果你想新增新的 agent：

1. 在 `.claude/agents/` 建立新的 `.md` 檔案
2. 使用現有 agent 作為模板
3. 定義清晰的職責和適用場景
4. 指定適當的工具權限
5. 更新本 README

## 🤝 回饋與改進

發現 agent 設計可以改進？歡迎提出建議：

1. 在 KANBAN.md 建立改進任務
2. 或直接編輯 agent 配置檔案
3. 測試並驗證改進效果

---

**最後更新**: 2025-10-03
**Agent 數量**: 8 個
**涵蓋領域**: Topping 開發、VSCode Extension、React UI、Python Backend、測試、專案管理、程式碼分析
