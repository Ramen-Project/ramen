"""
圖形模型測試
"""

import json
import pytest
from datetime import datetime
from pathlib import Path
import tempfile
import os

from ramen.core.models import (
    Position, Size, Port, NodeMetadata, RamenNode, RamenEdge, Variable,
    GraphMetadata, RamenGraph, RamenProject, GraphSerializer, GraphDeserializer,
    GRAPH_FORMAT_VERSION, RamenFileHeader, RamenGraphFile, RamenProjectFile
)


class TestModels:
    """測試數據模型"""
    
    def test_position(self):
        """測試位置類型"""
        pos = Position(x=100.0, y=200.0)
        assert pos.x == 100.0
        assert pos.y == 200.0
    
    def test_size(self):
        """測試尺寸類型"""
        size = Size(width=300.0, height=200.0)
        assert size.width == 300.0
        assert size.height == 200.0
    
    def test_port(self):
        """測試埠定義"""
        port = Port(
            id="port-1",
            name="input",
            type_id="float",
            is_input=True,
            description="Test input port",
            optional=False,
            default_value=0.0
        )
        assert port.id == "port-1"
        assert port.name == "input"
        assert port.type_id == "float"
        assert port.is_input is True
        assert port.description == "Test input port"
        assert port.optional is False
        assert port.default_value == 0.0
    
    def test_node_metadata(self):
        """測試節點元數據"""
        metadata = NodeMetadata(
            type="operator",
            name="Add",
            namespace="Math",
            description="Addition operation",
            category="Arithmetic",
            version="1.0.0"
        )
        assert metadata.type == "operator"
        assert metadata.name == "Add"
        assert metadata.namespace == "Math"
        assert metadata.description == "Addition operation"
        assert metadata.category == "Arithmetic"
        assert metadata.version == "1.0.0"
    
    def test_ramen_node(self):
        """測試節點定義"""
        metadata = NodeMetadata(type="operator", name="Add", namespace="Math")
        position = Position(x=100.0, y=200.0)
        input_port = Port(id="input1", name="a", type_id="float", is_input=True)
        output_port = Port(id="output1", name="result", type_id="float", is_input=False)
        
        node = RamenNode(
            id="node-1",
            metadata=metadata,
            position=position,
            inputs=[input_port],
            outputs=[output_port]
        )
        
        assert node.id == "node-1"
        assert node.metadata == metadata
        assert node.position == position
        assert len(node.inputs) == 1
        assert len(node.outputs) == 1
        assert node.state == "idle"  # 預設值
        assert node.selected is False  # 預設值
        assert node.visible is True  # 預設值
    
    def test_ramen_edge(self):
        """測試邊定義"""
        edge = RamenEdge(
            id="edge-1",
            source_node_id="node-1",
            source_port_id="output1",
            target_node_id="node-2",
            target_port_id="input1"
        )
        
        assert edge.id == "edge-1"
        assert edge.source_node_id == "node-1"
        assert edge.source_port_id == "output1"
        assert edge.target_node_id == "node-2"
        assert edge.target_port_id == "input1"
        assert edge.selected is False  # 預設值
        assert edge.visible is True  # 預設值
    
    def test_variable(self):
        """測試變數定義"""
        var = Variable(
            id="var-1",
            name="x",
            type_id="float",
            value=3.14,
            description="Pi value",
            constant=True
        )
        
        assert var.id == "var-1"
        assert var.name == "x"
        assert var.type_id == "float"
        assert var.value == 3.14
        assert var.description == "Pi value"
        assert var.constant is True
    
    def test_graph_metadata(self):
        """測試圖形元數據"""
        metadata = GraphMetadata(
            name="Test Graph",
            description="A test graph",
            version="1.0.0",
            author="Test User",
            tags=["test", "demo"]
        )
        
        assert metadata.name == "Test Graph"
        assert metadata.description == "A test graph"
        assert metadata.version == "1.0.0"
        assert metadata.author == "Test User"
        assert metadata.tags == ["test", "demo"]
        # created_at 和 last_modified 應該有預設值
        assert metadata.created_at is not None
        assert metadata.last_modified is not None
    
    def test_ramen_graph(self):
        """測試圖形定義"""
        metadata = GraphMetadata(name="Test Graph", version="1.0.0")
        graph = RamenGraph(id="graph-1", metadata=metadata)
        
        assert graph.id == "graph-1"
        assert graph.metadata == metadata
        assert graph.nodes == []  # 預設值
        assert graph.edges == []  # 預設值
        assert graph.variables == []  # 預設值
    
    def test_ramen_project(self):
        """測試專案定義"""
        graph = RamenGraph(
            id="graph-1",
            metadata=GraphMetadata(name="Test Graph", version="1.0.0")
        )
        
        project = RamenProject(
            id="project-1",
            name="Test Project",
            description="A test project",
            graphs=[graph]
        )
        
        assert project.id == "project-1"
        assert project.name == "Test Project"
        assert project.description == "A test project"
        assert len(project.graphs) == 1
        assert project.graphs[0] == graph
        assert project.version == "1.0.0"  # 預設值


class TestGraphSerializer:
    """測試圖形序列化器"""
    
    def create_sample_graph(self) -> RamenGraph:
        """創建測試用的圖形"""
        metadata = GraphMetadata(name="Sample Graph", version="1.0.0")
        node_metadata = NodeMetadata(type="operator", name="Add", namespace="Math")
        position = Position(x=100.0, y=200.0)
        input_port = Port(id="input1", name="a", type_id="float", is_input=True)
        output_port = Port(id="output1", name="result", type_id="float", is_input=False)
        
        node = RamenNode(
            id="node-1",
            metadata=node_metadata,
            position=position,
            inputs=[input_port],
            outputs=[output_port]
        )
        
        edge = RamenEdge(
            id="edge-1",
            source_node_id="node-1",
            source_port_id="output1",
            target_node_id="node-2",
            target_port_id="input1"
        )
        
        return RamenGraph(
            id="graph-1",
            metadata=metadata,
            nodes=[node],
            edges=[edge]
        )
    
    def test_to_dict(self):
        """測試轉換為字典"""
        graph = self.create_sample_graph()
        data = GraphSerializer.to_dict(graph)
        
        assert isinstance(data, dict)
        assert data["id"] == "graph-1"
        assert data["metadata"]["name"] == "Sample Graph"
        assert len(data["nodes"]) == 1
        assert len(data["edges"]) == 1
        
        # 測試嵌套對象的轉換
        node_data = data["nodes"][0]
        assert node_data["id"] == "node-1"
        assert node_data["metadata"]["name"] == "Add"
        assert node_data["position"]["x"] == 100.0
    
    def test_to_json(self):
        """測試轉換為 JSON"""
        graph = self.create_sample_graph()
        json_str = GraphSerializer.to_json(graph)
        
        assert isinstance(json_str, str)
        
        # 確保可以解析回來
        data = json.loads(json_str)
        assert data["id"] == "graph-1"
        assert data["metadata"]["name"] == "Sample Graph"
    
    def test_save_graph(self):
        """測試保存圖形到檔案"""
        graph = self.create_sample_graph()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test_graph.ramen"
            GraphSerializer.save_graph(graph, file_path)
            
            assert file_path.exists()
            
            # 讀取並驗證內容
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert data["header"]["format"] == "ramen-graph"
            assert data["header"]["version"] == GRAPH_FORMAT_VERSION
            assert data["graph"]["id"] == "graph-1"
    
    def test_save_project(self):
        """測試保存專案到檔案"""
        graph = self.create_sample_graph()
        project = RamenProject(
            id="project-1",
            name="Test Project",
            graphs=[graph]
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test_project.ramen-project"
            GraphSerializer.save_project(project, file_path)
            
            assert file_path.exists()
            
            # 讀取並驗證內容
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert data["header"]["format"] == "ramen-project"
            assert data["header"]["version"] == GRAPH_FORMAT_VERSION
            assert data["project"]["id"] == "project-1"


class TestGraphDeserializer:
    """測試圖形反序列化器"""
    
    def create_sample_graph_dict(self) -> dict:
        """創建測試用的圖形字典"""
        return {
            "id": "graph-1",
            "metadata": {
                "name": "Sample Graph",
                "version": "1.0.0",
                "created_at": "2023-01-01T00:00:00Z",
                "last_modified": "2023-01-01T00:00:00Z"
            },
            "nodes": [
                {
                    "id": "node-1",
                    "metadata": {
                        "type": "operator",
                        "name": "Add",
                        "namespace": "Math"
                    },
                    "position": {"x": 100.0, "y": 200.0},
                    "inputs": [
                        {
                            "id": "input1",
                            "name": "a",
                            "type_id": "float",
                            "is_input": True
                        }
                    ],
                    "outputs": [
                        {
                            "id": "output1",
                            "name": "result",
                            "type_id": "float",
                            "is_input": False
                        }
                    ]
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source_node_id": "node-1",
                    "source_port_id": "output1",
                    "target_node_id": "node-2",
                    "target_port_id": "input1"
                }
            ],
            "variables": []
        }
    
    def test_from_dict(self):
        """測試從字典創建對象"""
        graph_dict = self.create_sample_graph_dict()
        graph = GraphDeserializer.from_dict(graph_dict, RamenGraph)
        
        assert isinstance(graph, RamenGraph)
        assert graph.id == "graph-1"
        assert graph.metadata.name == "Sample Graph"
        assert len(graph.nodes) == 1
        assert len(graph.edges) == 1
        
        # 測試嵌套對象的轉換
        node = graph.nodes[0]
        assert isinstance(node, RamenNode)
        assert node.id == "node-1"
        assert isinstance(node.metadata, NodeMetadata)
        assert isinstance(node.position, Position)
        assert node.position.x == 100.0
    
    def test_from_json(self):
        """測試從 JSON 創建對象"""
        graph_dict = self.create_sample_graph_dict()
        json_str = json.dumps(graph_dict)
        
        graph = GraphDeserializer.from_json(json_str, RamenGraph)
        
        assert isinstance(graph, RamenGraph)
        assert graph.id == "graph-1"
        assert graph.metadata.name == "Sample Graph"
    
    def test_load_graph(self):
        """測試從檔案載入圖形"""
        graph_dict = self.create_sample_graph_dict()
        graph_file = RamenGraphFile(
            header=RamenFileHeader(
                format="ramen-graph",
                version=GRAPH_FORMAT_VERSION
            ),
            graph=GraphDeserializer.from_dict(graph_dict, RamenGraph)
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test_graph.ramen"
            
            # 保存檔案
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(GraphSerializer.to_dict(graph_file), f)
            
            # 載入檔案
            loaded_graph = GraphDeserializer.load_graph(file_path)
            
            assert isinstance(loaded_graph, RamenGraph)
            assert loaded_graph.id == "graph-1"
            assert loaded_graph.metadata.name == "Sample Graph"
    
    def test_load_project(self):
        """測試從檔案載入專案"""
        graph_dict = self.create_sample_graph_dict()
        project_dict = {
            "id": "project-1",
            "name": "Test Project",
            "graphs": [graph_dict],
            "version": "1.0.0",
            "created_at": "2023-01-01T00:00:00Z",
            "last_modified": "2023-01-01T00:00:00Z"
        }
        
        project_file = RamenProjectFile(
            header=RamenFileHeader(
                format="ramen-project",
                version=GRAPH_FORMAT_VERSION
            ),
            project=GraphDeserializer.from_dict(project_dict, RamenProject)
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test_project.ramen-project"
            
            # 保存檔案
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(GraphSerializer.to_dict(project_file), f)
            
            # 載入檔案
            loaded_project = GraphDeserializer.load_project(file_path)
            
            assert isinstance(loaded_project, RamenProject)
            assert loaded_project.id == "project-1"
            assert loaded_project.name == "Test Project"
            assert len(loaded_project.graphs) == 1


if __name__ == "__main__":
    pytest.main([__file__])