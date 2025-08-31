# 🍜 Ramen Git 整合功能示例

## 📋 功能概覽

Ramen 提供了完整的 Git 整合功能，支援 `.ramen` 檔案的語義化版本控制：

### ✨ 主要功能

1. **語義化差異比較** - 節點層級的智能差異檢測
2. **VSCode 整合命令** - 原生 Git 工作流程整合
3. **視覺化差異檢視** - 圖形化差異展示
4. **版本歷史追蹤** - 完整的變更歷史記錄

## 🚀 使用指南

### 前置條件

1. 確保專案在 Git repository 中
2. 已安裝 Ramen VSCode 擴展
3. Ramen 後端服務正在運行

### 命令列表

| 命令 | 描述 | 快捷鍵 |
|------|------|--------|
| `Ramen: Show Git Diff` | 顯示語義化差異 | - |
| `Ramen: Git Status` | 顯示 .ramen 檔案的 Git 狀態 | - |
| `Ramen: Git Log` | 顯示檔案的 Git 歷史 | - |

### 使用方式

#### 1. 語義化差異比較

```bash
# 在 VSCode 中
1. 開啟任意 .ramen 檔案
2. 右鍵選擇 "Ramen: Show Git Diff"
3. 或使用命令面板 (Ctrl+Shift+P) 搜尋 "Ramen: Show Git Diff"
```

#### 2. Git 狀態檢查

```bash
# 使用命令面板
Ctrl+Shift+P → "Ramen: Git Status"
```

#### 3. 版本歷史檢視

```bash
# 在 .ramen 檔案上
右鍵 → "Ramen: Git Log"
```

## 📊 語義化差異檢測

### 支援的變更類型

- **🟢 新增 (Added)**: 新增的節點或邊
- **🔴 刪除 (Removed)**: 刪除的節點或邊  
- **🟡 修改 (Modified)**: 節點屬性或配置變更
- **🔵 移動 (Moved)**: 節點位置變更
- **🟣 重連 (Reconnected)**: 邊的連接變更

### 檢測層級

1. **圖形元數據**: 名稱、描述、版本變更
2. **節點變更**: 
   - 節點類型和名稱
   - 位置變更
   - 配置變更
   - 埠變更
3. **邊變更**:
   - 連接關係變更
   - 標籤變更
4. **結構變更**: 整體圖形拓撲變化

## 🎯 實際範例

### 範例 1: 節點修改檢測

**原始版本:**
```json
{
  "nodes": [
    {
      "id": "math_1",
      "metadata": {"name": "Add", "type": "operator"},
      "position": {"x": 100, "y": 200}
    }
  ]
}
```

**修改後版本:**
```json
{
  "nodes": [
    {
      "id": "math_1", 
      "metadata": {"name": "Multiply", "type": "operator"},
      "position": {"x": 150, "y": 250}
    }
  ]
}
```

**檢測結果:**
```
Nodes modified (1):
  ~ math_1: Name: 'Add' → 'Multiply', Position: (100, 200) → (150, 250)
```

### 範例 2: 複合變更檢測

**變更內容:**
- 新增一個除法節點
- 修改現有節點名稱
- 調整節點位置
- 新增邊連接
- 更新圖形元數據

**檢測結果:**
```
Graph diff from v1.0 to v2.0
Total changes: 5

Nodes added (1):
  + div_1: Added node 'Divide Numbers' of type operator

Nodes modified (1):
  ~ add_1: Name: 'Add Numbers' → 'Addition Operation', Position: (100, 100) → (50, 150)

Nodes moved (1):
  → mult_1: Position: (300, 100) → (250, 150)

Edges added (1):
  + conn_2: Added connection from mult_1:product to div_1:dividend

Metadata changes (3):
  ~ Name: 'Math Calculator' → 'Advanced Math Calculator'
  ~ Description: 'Basic mathematical operations' → 'Extended mathematical operations with division'
  ~ Version: '1.0.0' → '2.0.0'
```

## 🔧 技術實現

### 架構組成

1. **後端 API** (`/git/diff`): 
   - Python 語義化差異引擎
   - FastAPI RESTful 接口
   - JSON 格式差異報告

2. **VSCode 擴展**:
   - TypeScript Git 整合命令
   - 原生 VSCode UI 整合
   - HTML webview 差異檢視

3. **差異比較引擎**:
   - 節點層級比較演算法
   - 圖形拓撲分析
   - 智能變更分類

### API 端點

```bash
# 計算語義化差異
POST /git/diff
{
  "oldGraph": {...},
  "newGraph": {...},
  "fromVersion": "v1.0",
  "toVersion": "v2.0" 
}

# 驗證圖形格式
POST /git/validate
{
  "graph": {...}
}

# 健康檢查
GET /git/health
```

## 🎨 視覺化介面

差異檢視提供豐富的視覺化功能：

- **📊 統計摘要**: 變更數量和類型分布
- **🎯 詳細變更**: 每個變更的具體描述
- **🎨 顏色編碼**: 不同變更類型的顏色區分
- **📋 變更列表**: 結構化的變更清單
- **🔍 搜尋過濾**: 快速定位特定變更

## 🚧 未來規劃

### Phase 3 後續功能

- **🔀 合併衝突解決**: 視覺化衝突解決工具
- **📈 版本歷史視覺化**: 圖形演進時間線
- **🌿 分支比較**: 跨分支差異比較
- **📝 自動變更描述**: AI 生成的變更摘要
- **🔄 三方合併**: 複雜合併場景支援

### 整合改進

- **🎯 性能優化**: 大型圖形的快速比較
- **📱 移動端支援**: 跨平台一致性
- **🔌 IDE 整合**: 其他編輯器支援
- **📊 分析工具**: 變更統計和趨勢分析

---

## 🏃 快速開始

### 1. 設置環境

```bash
# 啟動 Ramen 後端
uv run python -m ramen.entrypoint server --port 9001

# 在 VSCode 中開啟 .ramen 檔案
code my_graph.ramen
```

### 2. 建立 Git commit

```bash
git add my_graph.ramen
git commit -m "Initial graph version"

# 修改圖形...

git add my_graph.ramen  
git commit -m "Added new calculation nodes"
```

### 3. 檢視差異

```
VSCode → 右鍵 my_graph.ramen → "Ramen: Show Git Diff"
```

## 🎉 恭喜！

您現在已經可以使用 Ramen 的 Git 整合功能來追蹤和管理視覺化程式的版本變更了！

這是首個支援語義化差異比較的視覺程式設計環境，讓版本控制不再局限於文字比較。