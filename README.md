# Ramen 🍜

Ramen 是 Python 的下一代視覺化程式設計環境。它是一個 Visual Studio Code 擴充套件，讓使用者能夠透過直覺的節點式介面設計、編譯和執行計算圖。Ramen 圖形被編譯/JIT 編譯為 Python 字節碼，並在由 `uv` 管理的隔離、可重現的 Python 環境中執行。

## 主要特性

### VSCode 擴充套件（主要元件）
- **視覺化節點編輯器**：直接在 VSCode 中設計工作流程
- **即時執行**：在編輯器中立即查看結果
- **原生整合**：完全整合 VSCode 主題、命令面板和檔案系統
- **自動後端管理**：擴充套件自動管理 Python 後端服務生命週期

### Python 執行引擎
- **高效能執行**：圖形編譯/JIT 編譯為 Python 字節碼
- **環境隔離**：每個專案在獨立的 uv 管理環境中執行
- **插件系統**：透過「配料」（toppings）擴展功能（numpy、pandas、torch、plots 等）
- **命令列執行**：適用於生產環境和自動化
- **Python API**：程式化圖形執行（使用 `ramen` 或精簡版 `ramenrt`）

### 開發者體驗
- **即時日誌和錯誤報告**：WebSocket 串流即時更新
- **單一會話管理**：每個圖形一個會話，防止衝突編輯
- **測試驅動開發**：內建 TDD 工作流程支援

## 安裝

### 1. 安裝 VSCode 擴充套件（主要元件）
從 VSCode 市集安裝「Ramen Visual Programming」擴充套件，或從原始碼建置：

```bash
# 從原始碼建置
cd vscode-extension
npm install
npm run compile
npm run package  # 產生 .vsix 檔案
```

### 2. 安裝 Python 套件（後端服務）
```bash
# 完整安裝（編輯 + 執行時）
uv pip install ramen

# 或精簡安裝（用於嵌入/CI/CD）
uv pip install ramenrt
```

### 3. 安裝配料（選用）
```bash
uv add ramen-topping-numpy
uv add ramen-topping-pandas
uv add ramen-topping-torch
uv add ramen-topping-plots
```

## 快速開始

### VSCode 內的視覺化程式設計（主要使用方式）

1. **建立新專案**
    ```bash
    uv venv my-ramen-project
    cd my-ramen-project
    uv pip install ramen
    ```

2. **安裝所需配料**
    ```bash
    uv add ramen-topping-numpy
    uv add ramen-topping-pandas
    ```

3. **在 VSCode 中開啟專案**
    ```bash
    code .
    ```

4. **建立新的 .ramen 檔案**
    - 在檔案總管中右鍵 → 「新增檔案」→ `my_graph.ramen`
    - Ramen 圖形編輯器將自動開啟

5. **設計您的圖形**
    - 從側邊欄的節點庫拖放節點
    - 連接節點以建立工作流程
    - 使用屬性面板配置節點參數

6. **執行圖形**
    - 在編輯器中按 F5 或使用 Ctrl+R
    - 在整合的輸出面板中查看結果
    - 或使用命令列：`ramen-cli run my_graph`

## 使用範例

### 命令列執行（自動化和 CI/CD）

從命令列執行已儲存的圖形：

```bash
# 基本圖形執行（自動解析為 my_pipeline.ramen）
ramen-cli run my_pipeline input=data.csv output=results.json

# 機器學習訓練與超參數
ramen-cli run train_model dataset=mnist.pkl learning_rate=0.01 epochs=100

# 資料處理管線
ramen-cli run process_data source=raw.csv target=clean.csv batch_size=1000

# 伺服器模式（遠端部署）
ramen-cli server --port 8080
```

### Python API

```python
import ramen

# 載入並執行圖形
graph = ramen.load_graph("my_graph.ramen")
result = ramen.execute_graph(graph, inputs={"x": 42})
print(result)

# 使用精簡執行時（生產環境）
import ramenrt
result = ramenrt.run("my_graph.ramen", x=42)
```

### VSCode 擴充套件功能

- **Ctrl+Shift+P**：開啟命令面板
  - `Ramen: New Graph` - 建立新圖形
  - `Ramen: Execute Graph` - 執行當前圖形
  - `Ramen: Export to Python` - 匯出為 Python 程式碼
- **F5**：執行當前圖形
- **Ctrl+S**：儲存圖形
- **拖放**：從節點庫添加節點
- **右鍵選單**：節點操作（刪除、複製、配置）

## 專案架構

```
Ramen/
├── vscode-extension/        # VSCode 擴充套件（主要元件）
│   ├── src/extension/      # 擴充套件主機程式碼
│   ├── webview-build/      # React 圖形編輯器
│   └── package.json        # 擴充套件設定
├── src/ramen/              # Python 後端服務
│   ├── core/              # 核心執行引擎
│   ├── api/               # REST API 和 WebSocket
│   └── cli/               # 命令列介面
├── toppings/              # 插件套件
│   ├── ramen-topping-numpy/
│   ├── ramen-topping-pandas/
│   ├── ramen-topping-torch/
│   └── ramen-topping-plots/
└── docs/technical-design/  # 技術文件
```

## 開發

### 必要條件

- Node.js 18+ 和 npm（VSCode 擴充套件）
- Bun（webview React 應用程式）
- Python 3.10+ 和 uv（Python 後端）
- Visual Studio Code

### 建置專案

```bash
# 建置 VSCode 擴充套件
cd vscode-extension
npm install
npm run compile

# 建置 webview
cd webview-build
bun install
bun run build

# 安裝 Python 相依套件
uv sync
```

### 測試

```bash
# 執行 VSCode 擴充套件測試
cd vscode-extension
npm test

# 執行 webview 測試
cd webview-build
bun run test

# 執行 Python 測試
uv run pytest
```

### 開發模式

1. 在 VSCode 中開啟專案
2. 按 F5 啟動擴充套件開發主機
3. 在新視窗中開啟 `.ramen` 檔案進行測試

## 文件

- [技術設計規範](docs/technical-design/) - 詳細的架構和設計文件
- [API 文件](docs/api/) - Python API 和 REST API 參考
- [擴充套件開發](docs/extension/) - VSCode 擴充套件開發指南
- [配料開發](docs/toppings/) - 建立自訂配料插件

## 貢獻

歡迎貢獻！請查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解開發指南。

我們遵循 TDD（測試驅動開發）和 KANBAN 工作流程。請在開始任何功能前更新 [KANBAN.md](KANBAN.md)。

## 授權

MIT License
