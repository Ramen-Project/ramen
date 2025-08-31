# 新一代 Topping 介面設計指南

## 概述

新的 Ramen Topping 系統提供了兩套 API 來滿足不同開發者的需求：

1. **簡化版 API**：使用裝飾器系統，讓 Python 開發者只需專注於業務邏輯
2. **進階版 API**：使用 `Node(StateClass)` 語法，提供完整的自定義能力

## 簡化版 API

### 基本用法

```python
from ramen.topping import ramen_node, input_port, output_port, PortType

@ramen_node(
    name="CSV Reader",
    category="Data I/O",
    description="讀取 CSV 檔案",
    icon="📄",
    color="#4CAF50"
)
@input_port("file_path", PortType.STRING, description="CSV 檔案路徑")
@input_port("encoding", PortType.STRING, default="utf-8", description="檔案編碼")
@output_port("dataframe", PortType.DATAFRAME, description="載入的資料")
@output_port("row_count", PortType.NUMBER, description="資料列數")
def csv_reader(file_path: str, encoding: str = "utf-8") -> dict:
    \"\"\"簡單的 CSV 讀取器實作。\"\"\"
    import pandas as pd
    df = pd.read_csv(file_path, encoding=encoding)
    
    return {
        "dataframe": df,
        "row_count": len(df)
    }
```

### 特點

- **零前端知識要求**：完全不需要了解 React/TypeScript
- **專注業務邏輯**：只需實作核心算法
- **自動 UI 生成**：系統根據端口類型自動生成適當的 UI
- **即時預覽**：修改程式碼立即看到 UI 變化

## 進階版 API

### 基本結構

```python
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ramen.topping import Node, on, ToppingBase, NodeMetadata, PortDefinition, PortType

# 1. 定義狀態模型
class CSVReaderState(BaseModel):
    # UI 狀態
    status: str = "ready"
    preview_columns: List[str] = []
    error: Optional[str] = None
    
    # 節點屬性
    encoding: str = "utf-8"
    show_preview: bool = True
    
    # 動態端口
    dynamic_outputs: List[Dict[str, Any]] = []

# 2. 使用 Node(StateClass) 語法
class AdvancedCSVReader(Node(CSVReaderState)):
    \"\"\"進階 CSV 讀取器，支援動態欄位輸出和預覽。\"\"\"
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="advanced",
            node_type="csv_reader",
            display_name="Advanced CSV Reader",
            category="Data I/O",
            inputs=[
                PortDefinition("file_path", PortType.STRING, description="檔案路徑")
            ],
            outputs=[
                PortDefinition("dataframe", PortType.DATAFRAME, description="完整資料")
            ]
        )
    
    def get_frontend_component(self):
        \"\"\"返回前端組件配置\"\"\"
        return {
            "component_path": "dist/components/AdvancedCSVReaderUI.js",
            "component_name": "AdvancedCSVReaderUI"
        }
    
    @on("input_changed")
    def handle_input_change(self, event_data: dict):
        \"\"\"處理檔案路徑變更，預覽文件並動態添加欄位端口\"\"\"
        if event_data["port_name"] == "file_path":
            try:
                import pandas as pd
                file_path = event_data["value"]
                preview_df = pd.read_csv(file_path, nrows=1, encoding=self.state.encoding)
                
                # 更新狀態（自動同步到前端）
                self.state.preview_columns = preview_df.columns.tolist()
                self.state.status = "preview_ready"
                self.state.error = None
                
                # 動態創建欄位端口
                self.state.dynamic_outputs = [
                    {
                        "name": f"col_{col}",
                        "type": "array",
                        "description": f"Column: {col}"
                    }
                    for col in preview_df.columns
                ]
                
            except Exception as e:
                self.state.status = "error"
                self.state.error = str(e)
    
    @on("property_changed")
    def handle_property_change(self, event_data: dict):
        \"\"\"處理屬性變更\"\"\"
        prop_name = event_data["property_name"]
        value = event_data["value"]
        
        # 型別安全的狀態更新
        if hasattr(self.state, prop_name):
            setattr(self.state, prop_name, value)
    
    @on("execute")
    def handle_execute(self, inputs: dict):
        \"\"\"執行節點\"\"\"
        self.state.status = "executing"
        
        try:
            import pandas as pd
            file_path = inputs.get("file_path")
            df = pd.read_csv(file_path, encoding=self.state.encoding)
            
            # 準備輸出
            result = {"dataframe": df}
            for col in df.columns:
                result[f"col_{col}"] = df[col].values
            
            self.state.status = "completed"
            return result
            
        except Exception as e:
            self.state.status = "error"
            self.state.error = str(e)
            raise
```

### 前端組件開發

進階用戶可以開發自定義的 React 組件：

```typescript
// src/components/AdvancedCSVReaderUI.tsx
import React from 'react';
import { NodeComponentProps } from '@ramen/types';

interface CSVReaderState {
    status: string;
    preview_columns: string[];
    error?: string;
    encoding: string;
    show_preview: boolean;
}

export const AdvancedCSVReaderUI: React.FC<NodeComponentProps<CSVReaderState>> = ({ 
    state, 
    onEvent 
}) => {
    return (
        <div className="csv-reader-ui">
            <input 
                type="file"
                onChange={(e) => 
                    onEvent('input_changed', {
                        port_name: 'file_path', 
                        value: e.target.files[0]?.path
                    })
                }
            />
            
            <select 
                value={state.encoding}
                onChange={(e) => 
                    onEvent('property_changed', {
                        property_name: 'encoding', 
                        value: e.target.value
                    })
                }
            >
                <option value="utf-8">UTF-8</option>
                <option value="big5">Big5</option>
            </select>
            
            {state.show_preview && state.preview_columns.length > 0 && (
                <div>
                    <h4>預覽欄位：</h4>
                    <ul>
                        {state.preview_columns.map(col => (
                            <li key={col}>{col}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className={`status ${state.status}`}>
                狀態: {state.status}
                {state.error && <div className="error">{state.error}</div>}
            </div>
        </div>
    );
};
```

## 核心特性

### 1. Pydantic 狀態管理

- **型別安全**：編譯時和執行時驗證
- **自動同步**：狀態變更透過 WebSocket 即時同步到前端
- **IDE 支援**：完整的 syntax highlight 和 autocomplete

```python
# IDE 提供完整支援
self.state.status = "loading"  # ✓ 型別安全
self.state.invalid = "error"   # ✗ IDE 警告
```

### 2. 事件驅動架構

- **`@on("event_name")`**：裝飾器監聽事件
- **自動事件分發**：系統自動路由前端事件到對應處理器
- **非同步支援**：支援非同步事件處理

### 3. 動態能力

- **動態端口**：可在運行時添加/移除輸入輸出端口
- **動態類型**：根據輸入自動推導輸出類型
- **動態 UI**：狀態變更自動觸發 UI 更新

### 4. 透明通訊

- **WebSocket 自動管理**：開發者無需處理通訊細節
- **狀態自動同步**：Pydantic model 變更自動推送到前端
- **事件自動路由**：前端事件自動分發到後端處理器

## Topping 註冊

### 簡化版自動註冊

系統自動掃描模組中的裝飾器函數：

```python
# my_simple_topping.py
from ramen.topping import ramen_node, input_port, output_port, PortType

@ramen_node(name="My Node", category="Custom")
@input_port("input", PortType.STRING)
@output_port("output", PortType.STRING)
def my_node(input: str) -> dict:
    return {"output": input.upper()}

# 無需額外註冊程式碼 - 系統自動發現
```

### 進階版手動註冊

```python
class AdvancedTopping(ToppingBase):
    def get_name(self) -> str:
        return "advanced_example"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "進階 topping 範例"
    
    def initialize(self):
        self.register_node(AdvancedCSVReader)
        self.register_node(InteractiveChart)

def get_topping() -> ToppingBase:
    return AdvancedTopping()
```

## 開發工作流程

### 簡化版工作流程

1. **寫 Python 函數** - 實作節點邏輯
2. **加裝飾器** - 定義節點介面
3. **測試執行** - 系統自動生成 UI 進行測試

### 進階版工作流程

1. **定義 Pydantic State** - 設計狀態模型
2. **實作 Node 類別** - 繼承 `Node(StateClass)`
3. **實作事件處理器** - 使用 `@on` 裝飾器
4. **開發前端組件**（可選）- 自定義 React 組件
5. **打包和測試** - 使用開發工具鏈

## 最佳實踐

### 狀態設計原則

1. **保持狀態扁平化** - 避免深層嵌套
2. **使用明確的型別** - 利用 Pydantic 的型別系統
3. **分離關注點** - UI 狀態、業務邏輯狀態、配置狀態分離

### 事件處理原則

1. **保持處理器簡潔** - 每個處理器專注單一職責
2. **錯誤處理** - 在狀態中記錄錯誤訊息
3. **非同步操作** - 長時間操作使用背景任務

### 前端組件設計

1. **響應式設計** - 適應不同螢幕尺寸
2. **無障礙支援** - 支援鍵盤導航和螢幕閱讀器
3. **一致的 UX** - 遵循 Ramen 的設計語言

## 遷移指南

### 從舊系統遷移

現有的 `ToppingBase` 和 `NodeFunction` 繼續支援，可以逐步遷移：

```python
# 舊系統（繼續支援）
class OldStyleNode(NodeFunction):
    def execute(self, context: NodeContext):
        # 現有程式碼不變
        pass
    
    def get_metadata(self) -> NodeMetadata:
        # 現有程式碼不變
        pass

# 新系統（推薦）
class NewStyleNode(Node(MyState)):
    @on("execute")
    def handle_execute(self, inputs: dict):
        # 新的實作方式
        pass
```

## 總結

新的 Topping 系統提供了強大而靈活的介面，讓不同技能水平的開發者都能輕鬆創建功能豐富的節點：

- **簡化版**：快速上手，專注業務邏輯
- **進階版**：完全自定義，支援複雜互動

無論選擇哪種方式，都能享受到型別安全、自動同步、熱重載等現代開發體驗。