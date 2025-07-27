"""
圖形模型數據結構
定義了 Ramen 中圖形、節點、邊和埠的核心數據結構
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Literal, Union
from datetime import datetime
import json
from pathlib import Path

# 基本類型別名
NodeId = str
EdgeId = str
PortId = str
TypeId = str

@dataclass
class Position:
    """位置信息"""
    x: float
    y: float

@dataclass
class Size:
    """尺寸信息"""
    width: float
    height: float

@dataclass
class Port:
    """埠定義"""
    id: PortId
    name: str
    type_id: TypeId
    is_input: bool
    description: Optional[str] = None
    optional: Optional[bool] = False
    default_value: Optional[Any] = None

@dataclass
class NodeMetadata:
    """節點元數據"""
    type: Literal['operator', 'variable', 'constant', 'group', 'comment']
    name: str
    namespace: str
    description: Optional[str] = None
    category: Optional[str] = None
    version: Optional[str] = None

@dataclass
class RamenNode:
    """節點定義"""
    id: NodeId
    metadata: NodeMetadata
    position: Position
    inputs: List[Port] = field(default_factory=list)
    outputs: List[Port] = field(default_factory=list)
    size: Optional[Size] = None
    parent_id: Optional[NodeId] = None
    config: Optional[Dict[str, Any]] = None
    state: Optional[Literal['idle', 'running', 'completed', 'error']] = 'idle'
    selected: Optional[bool] = False
    visible: Optional[bool] = True
    data: Optional[Dict[str, Any]] = None

@dataclass
class EdgeStyle:
    """邊樣式"""
    color: Optional[str] = None
    width: Optional[float] = None
    dash: Optional[List[float]] = None

@dataclass
class RamenEdge:
    """邊定義"""
    id: EdgeId
    source_node_id: NodeId
    source_port_id: PortId
    target_node_id: NodeId
    target_port_id: PortId
    label: Optional[str] = None
    selected: Optional[bool] = False
    visible: Optional[bool] = True
    style: Optional[EdgeStyle] = None
    data: Optional[Dict[str, Any]] = None

@dataclass
class Variable:
    """變數定義"""
    id: str
    name: str
    type_id: TypeId
    value: Optional[Any] = None
    description: Optional[str] = None
    constant: Optional[bool] = False

@dataclass
class GraphMetadata:
    """圖形元數據"""
    name: str
    description: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_modified: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0.0"
    author: Optional[str] = None
    tags: Optional[List[str]] = None

@dataclass
class Viewport:
    """檢視狀態"""
    x: float
    y: float
    zoom: float

@dataclass
class RamenGraph:
    """圖形定義"""
    id: str
    metadata: GraphMetadata
    nodes: List[RamenNode] = field(default_factory=list)
    edges: List[RamenEdge] = field(default_factory=list)
    variables: List[Variable] = field(default_factory=list)
    viewport: Optional[Viewport] = None
    config: Optional[Dict[str, Any]] = None

@dataclass
class PythonConfig:
    """Python 環境配置"""
    version: Optional[str] = None
    dependencies: Optional[List[str]] = None

@dataclass
class ProjectConfig:
    """專案配置"""
    python: Optional[PythonConfig] = None
    settings: Optional[Dict[str, Any]] = None

@dataclass
class RamenProject:
    """專案定義"""
    id: str
    name: str
    description: Optional[str] = None
    graphs: List[RamenGraph] = field(default_factory=list)
    config: Optional[ProjectConfig] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_modified: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0.0"

@dataclass
class TypeInfo:
    """類型信息"""
    name: str
    color: str
    description: Optional[str] = None
    python_type: Optional[str] = None
    validator: Optional[Any] = None  # 函數不能序列化，需要特別處理

# 類型註冊表
TypeRegistry = Dict[TypeId, TypeInfo]

# 預設類型註冊表
DEFAULT_TYPE_REGISTRY: TypeRegistry = {
    'unknown': TypeInfo(name='<UNKNOWN>', color='#888888'),
    'bool': TypeInfo(name='Boolean', color='#96ef3c', python_type='bool'),
    'int': TypeInfo(name='Integer', color='#4287f5', python_type='int'),
    'str': TypeInfo(name='String', color='#C3A492', python_type='str'),
    'float': TypeInfo(name='Float', color='#FF8F00', python_type='float'),
    'double': TypeInfo(name='Double', color='#AF47D2', python_type='float'),
    'tuple': TypeInfo(name='Tuple', color='#ff0073', python_type='tuple'),
    'list': TypeInfo(name='List', color='rgb(255, 128, 192)', python_type='list'),
    'exception': TypeInfo(name='Exception', color='#ff4444', python_type='Exception'),
    'dict': TypeInfo(name='Dictionary', color='#00cc88', python_type='dict'),
    'count': TypeInfo(name='Count', color='#ffaa00', python_type='int'),
}

# 序列化格式版本
GRAPH_FORMAT_VERSION = "1.0.0"

@dataclass
class RamenFileHeader:
    """檔案標頭"""
    format: Literal['ramen-graph', 'ramen-project']
    version: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    app_version: Optional[str] = None

@dataclass
class RamenGraphFile:
    """.ramen 檔案格式 (單一圖形)"""
    header: RamenFileHeader
    graph: RamenGraph

@dataclass
class RamenProjectFile:
    """.ramen-project 檔案格式 (專案)"""
    header: RamenFileHeader
    project: RamenProject


class GraphSerializer:
    """圖形序列化器"""
    
    @staticmethod
    def to_dict(obj: Union[RamenGraph, RamenProject, RamenGraphFile, RamenProjectFile]) -> Dict[str, Any]:
        """將對象轉換為字典"""
        if hasattr(obj, '__dataclass_fields__'):
            result = {}
            for field_name, field_def in obj.__dataclass_fields__.items():
                value = getattr(obj, field_name)
                if value is None:
                    continue
                    
                # 遞歸處理嵌套對象
                if hasattr(value, '__dataclass_fields__'):
                    result[field_name] = GraphSerializer.to_dict(value)
                elif isinstance(value, list):
                    result[field_name] = [
                        GraphSerializer.to_dict(item) if hasattr(item, '__dataclass_fields__') else item
                        for item in value
                    ]
                elif isinstance(value, dict):
                    result[field_name] = {
                        k: GraphSerializer.to_dict(v) if hasattr(v, '__dataclass_fields__') else v
                        for k, v in value.items()
                    }
                else:
                    result[field_name] = value
            return result
        return obj
    
    @staticmethod
    def to_json(obj: Union[RamenGraph, RamenProject, RamenGraphFile, RamenProjectFile], 
                indent: Optional[int] = 2) -> str:
        """將對象轉換為 JSON 字符串"""
        return json.dumps(GraphSerializer.to_dict(obj), indent=indent, ensure_ascii=False)
    
    @staticmethod
    def save_graph(graph: RamenGraph, file_path: Union[str, Path]) -> None:
        """保存圖形到 .ramen 檔案"""
        file_path = Path(file_path)
        if not file_path.suffix:
            file_path = file_path.with_suffix('.ramen')
            
        graph_file = RamenGraphFile(
            header=RamenFileHeader(
                format='ramen-graph',
                version=GRAPH_FORMAT_VERSION
            ),
            graph=graph
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(GraphSerializer.to_json(graph_file))
    
    @staticmethod
    def save_project(project: RamenProject, file_path: Union[str, Path]) -> None:
        """保存專案到 .ramen-project 檔案"""
        file_path = Path(file_path)
        if not file_path.suffix:
            file_path = file_path.with_suffix('.ramen-project')
            
        project_file = RamenProjectFile(
            header=RamenFileHeader(
                format='ramen-project',
                version=GRAPH_FORMAT_VERSION
            ),
            project=project
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(GraphSerializer.to_json(project_file))


class GraphDeserializer:
    """圖形反序列化器"""
    
    @staticmethod
    def from_dict(data: Dict[str, Any], target_class: type) -> Any:
        """從字典創建對象"""
        if not hasattr(target_class, '__dataclass_fields__'):
            return data
        
        # 簡化實現：直接使用類型註解來創建對象
        try:
            # 對於測試，我們暫時返回一個簡單的實現
            if target_class == RamenGraph:
                # 處理嵌套的 metadata
                metadata_data = data.get('metadata', {})
                metadata = GraphMetadata(
                    name=metadata_data.get('name', 'Unknown'),
                    description=metadata_data.get('description'),
                    created_at=metadata_data.get('created_at', datetime.now().isoformat()),
                    last_modified=metadata_data.get('last_modified', datetime.now().isoformat()),
                    version=metadata_data.get('version', '1.0.0'),
                    author=metadata_data.get('author'),
                    tags=metadata_data.get('tags')
                )
                
                # 處理嵌套的 nodes
                nodes = []
                for node_data in data.get('nodes', []):
                    if isinstance(node_data, dict):
                        # 處理節點元數據
                        node_metadata_data = node_data.get('metadata', {})
                        node_metadata = NodeMetadata(
                            type=node_metadata_data.get('type', 'operator'),
                            name=node_metadata_data.get('name', 'Unknown'),
                            namespace=node_metadata_data.get('namespace', 'default'),
                            description=node_metadata_data.get('description'),
                            category=node_metadata_data.get('category'),
                            version=node_metadata_data.get('version')
                        )
                        
                        # 處理位置
                        position_data = node_data.get('position', {})
                        position = Position(x=position_data.get('x', 0), y=position_data.get('y', 0))
                        
                        # 處理埠
                        inputs = [Port(**port_data) for port_data in node_data.get('inputs', [])]
                        outputs = [Port(**port_data) for port_data in node_data.get('outputs', [])]
                        
                        node = RamenNode(
                            id=node_data['id'],
                            metadata=node_metadata,
                            position=position,
                            inputs=inputs,
                            outputs=outputs
                        )
                        nodes.append(node)
                
                # 處理 edges
                edges = [RamenEdge(**edge_data) for edge_data in data.get('edges', [])]
                
                # 處理 variables
                variables = [Variable(**var_data) for var_data in data.get('variables', [])]
                
                return RamenGraph(
                    id=data['id'],
                    metadata=metadata,
                    nodes=nodes,
                    edges=edges,
                    variables=variables
                )
            elif target_class == RamenProject:
                graphs = [GraphDeserializer.from_dict(graph, RamenGraph) for graph in data.get('graphs', [])]
                return RamenProject(
                    id=data['id'],
                    name=data['name'],
                    description=data.get('description'),
                    graphs=graphs,
                    created_at=data.get('created_at', datetime.now().isoformat()),
                    last_modified=data.get('last_modified', datetime.now().isoformat()),
                    version=data.get('version', '1.0.0')
                )
            else:
                # 通用處理
                field_values = {}
                for field_name, field_def in target_class.__dataclass_fields__.items():
                    if field_name in data:
                        field_values[field_name] = data[field_name]
                return target_class(**field_values)
                
        except Exception as e:
            # 如果創建對象失敗，返回原始數據
            return data
    
    @staticmethod
    def from_json(json_str: str, target_class: type) -> Any:
        """從 JSON 字符串創建對象"""
        data = json.loads(json_str)
        return GraphDeserializer.from_dict(data, target_class)
    
    @staticmethod
    def load_graph(file_path: Union[str, Path]) -> RamenGraph:
        """從 .ramen 檔案載入圖形"""
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.loads(f.read())
            
        # 從檔案數據中提取圖形數據
        graph_data = file_data.get('graph', file_data)
        return GraphDeserializer.from_dict(graph_data, RamenGraph)
    
    @staticmethod
    def load_project(file_path: Union[str, Path]) -> RamenProject:
        """從 .ramen-project 檔案載入專案"""
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.loads(f.read())
            
        # 從檔案數據中提取專案數據
        project_data = file_data.get('project', file_data)
        return GraphDeserializer.from_dict(project_data, RamenProject)