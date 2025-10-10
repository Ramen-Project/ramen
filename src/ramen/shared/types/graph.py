"""
Graph type definitions
圖形資料結構定義
"""

from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

from .common import Position


class PortType(str, Enum):
    """節點端口類型"""
    INPUT = "input"
    OUTPUT = "output"


class DataType(str, Enum):
    """資料類型"""
    ANY = "any"
    STRING = "str"
    NUMBER = "int"
    FLOAT = "float"
    BOOLEAN = "bool"
    LIST = "list"
    DICT = "dict"
    TUPLE = "tuple"
    NONE = "None"


class PortData(BaseModel):
    """端口定義"""
    id: str = Field(..., description="端口 ID")
    name: str = Field(..., description="端口名稱")
    type: PortType = Field(..., description="端口類型")
    data_type: str = Field(..., description="資料類型")
    label: Optional[str] = Field(None, description="顯示標籤")
    default_value: Optional[Any] = Field(None, description="預設值")
    required: bool = Field(False, description="是否必填")
    description: Optional[str] = Field(None, description="描述")


class NodeMetadata(BaseModel):
    """節點元數據"""
    type: str = Field(..., description="節點類型")
    name: str = Field(..., description="節點名稱")
    namespace: str = Field(..., description="命名空間")
    description: str = Field(..., description="描述")
    icon: Optional[str] = Field(None, description="圖標")
    color: Optional[str] = Field(None, description="顏色")
    category: Optional[str] = Field(None, description="分類")
    version: Optional[str] = Field(None, description="版本")


class NodeData(BaseModel):
    """節點資料"""
    id: str = Field(..., description="節點 ID")
    type: str = Field(..., description="節點類型")
    position: Position = Field(..., description="位置")
    data: Dict[str, Any] = Field(default_factory=dict, description="節點資料")
    metadata: Optional[NodeMetadata] = Field(None, description="元數據")
    inputs: Optional[List[PortData]] = Field(None, description="輸入端口")
    outputs: Optional[List[PortData]] = Field(None, description="輸出端口")


class EdgeData(BaseModel):
    """邊資料"""
    id: str = Field(..., description="邊 ID")
    source: str = Field(..., description="來源節點 ID")
    source_handle: str = Field(..., description="來源端口 ID")
    target: str = Field(..., description="目標節點 ID")
    target_handle: str = Field(..., description="目標端口 ID")
    animated: bool = Field(False, description="是否動畫")
    style: Optional[Dict[str, Any]] = Field(None, description="樣式")


class GraphMetadata(BaseModel):
    """圖形元數據"""
    name: str = Field(..., description="圖形名稱")
    description: Optional[str] = Field(None, description="描述")
    version: Optional[str] = Field(None, description="版本")
    author: Optional[str] = Field(None, description="作者")
    created_at: Optional[str] = Field(None, description="創建時間")
    last_modified: Optional[str] = Field(None, description="最後修改時間")
    tags: Optional[List[str]] = Field(None, description="標籤")


class Variable(BaseModel):
    """變數定義"""
    name: str = Field(..., description="變數名稱")
    type: str = Field(..., description="變數類型")
    value: Any = Field(..., description="變數值")
    description: Optional[str] = Field(None, description="描述")


class GraphData(BaseModel):
    """完整的圖形資料"""
    id: str = Field(..., description="圖形 ID")
    metadata: GraphMetadata = Field(..., description="元數據")
    nodes: List[NodeData] = Field(default_factory=list, description="節點列表")
    edges: List[EdgeData] = Field(default_factory=list, description="邊列表")
    variables: Optional[List[Variable]] = Field(None, description="變數列表")


class RamenFileHeader(BaseModel):
    """.ramen 檔案標頭"""
    format: str = Field("ramen-graph", description="檔案格式")
    version: str = Field("1.0.0", description="格式版本")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="創建時間")


class RamenFile(BaseModel):
    """.ramen 檔案格式"""
    header: RamenFileHeader = Field(..., description="檔案標頭")
    graph: GraphData = Field(..., description="圖形資料")


class GraphDependencies(BaseModel):
    """圖形依賴"""
    toppings: List[str] = Field(default_factory=list, description="Topping 依賴")
    python_packages: List[str] = Field(default_factory=list, description="Python 套件依賴")
