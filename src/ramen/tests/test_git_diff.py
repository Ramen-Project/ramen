"""
測試圖形差異比較系統
"""

import pytest
from datetime import datetime

from ramen.core.models import (
    RamenGraph, RamenNode, RamenEdge, GraphMetadata, 
    NodeMetadata, Position, Port
)
from ramen.git.diff import (
    GraphDiffer, GraphDiffResult, DiffType, 
    NodeDiff, EdgeDiff, format_diff_summary
)


class TestGraphDiffer:
    """測試圖形差異比較器"""
    
    def setup_method(self):
        """設置測試環境"""
        self.differ = GraphDiffer()
        
        # 建立測試用的基本圖形
        self.base_metadata = GraphMetadata(
            name="Test Graph",
            description="Test Description",
            version="1.0.0"
        )
        
        self.base_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator",
                name="Add",
                namespace="math"
            ),
            position=Position(x=100, y=200),
            inputs=[Port(id="in1", name="a", type_id="int", is_input=True)],
            outputs=[Port(id="out1", name="result", type_id="int", is_input=False)]
        )
        
        self.base_edge = RamenEdge(
            id="edge_1",
            source_node_id="node_1",
            source_port_id="out1",
            target_node_id="node_2", 
            target_port_id="in1"
        )
    
    def create_graph(self, nodes=None, edges=None, metadata=None):
        """建立測試圖形"""
        return RamenGraph(
            id="test_graph",
            metadata=metadata or self.base_metadata,
            nodes=nodes or [],
            edges=edges or []
        )
    
    def test_identical_graphs(self):
        """測試相同圖形的比較"""
        graph1 = self.create_graph([self.base_node], [self.base_edge])
        graph2 = self.create_graph([self.base_node], [self.base_edge])
        
        result = self.differ.compare(graph1, graph2)
        
        assert result.is_empty
        assert result.total_changes == 0
        assert len(result.nodes_added) == 0
        assert len(result.nodes_removed) == 0
        assert len(result.nodes_modified) == 0
        assert len(result.edges_added) == 0
        assert len(result.edges_removed) == 0
    
    def test_node_addition(self):
        """測試節點新增檢測"""
        graph1 = self.create_graph([], [])
        graph2 = self.create_graph([self.base_node], [])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert result.total_changes == 1
        assert len(result.nodes_added) == 1
        
        added_node = result.nodes_added[0]
        assert added_node.node_id == "node_1"
        assert added_node.diff_type == DiffType.ADDED
        assert added_node.new_data is not None
        assert added_node.old_data is None
        assert "Added node 'Add'" in added_node.changes[0]
    
    def test_node_removal(self):
        """測試節點刪除檢測"""
        graph1 = self.create_graph([self.base_node], [])
        graph2 = self.create_graph([], [])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert result.total_changes == 1
        assert len(result.nodes_removed) == 1
        
        removed_node = result.nodes_removed[0]
        assert removed_node.node_id == "node_1"
        assert removed_node.diff_type == DiffType.REMOVED
        assert removed_node.old_data is not None
        assert removed_node.new_data is None
        assert "Removed node 'Add'" in removed_node.changes[0]
    
    def test_node_modification(self):
        """測試節點修改檢測"""
        node_old = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Add", namespace="math"),
            position=Position(x=100, y=200)
        )
        
        node_new = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Multiply", namespace="math"),
            position=Position(x=100, y=200)
        )
        
        graph1 = self.create_graph([node_old], [])
        graph2 = self.create_graph([node_new], [])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert len(result.nodes_modified) == 1
        
        modified_node = result.nodes_modified[0]
        assert modified_node.node_id == "node_1"
        assert modified_node.diff_type == DiffType.MODIFIED
        assert any("Name: 'Add' → 'Multiply'" in change for change in modified_node.changes)
    
    def test_node_movement(self):
        """測試節點位置移動檢測"""
        node_old = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Add", namespace="math"),
            position=Position(x=100, y=200)
        )
        
        node_new = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Add", namespace="math"),
            position=Position(x=150, y=250)
        )
        
        graph1 = self.create_graph([node_old], [])
        graph2 = self.create_graph([node_new], [])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert len(result.nodes_moved) == 1
        
        moved_node = result.nodes_moved[0]
        assert moved_node.node_id == "node_1"
        assert moved_node.diff_type == DiffType.MOVED
        assert any("Position: (100, 200) → (150, 250)" in change for change in moved_node.changes)
    
    def test_edge_addition(self):
        """測試邊新增檢測"""
        graph1 = self.create_graph([self.base_node], [])
        graph2 = self.create_graph([self.base_node], [self.base_edge])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert len(result.edges_added) == 1
        
        added_edge = result.edges_added[0]
        assert added_edge.edge_id == "edge_1"
        assert added_edge.diff_type == DiffType.ADDED
        assert "Added connection from node_1:out1 to node_2:in1" in added_edge.changes[0]
    
    def test_edge_removal(self):
        """測試邊刪除檢測"""
        graph1 = self.create_graph([self.base_node], [self.base_edge])
        graph2 = self.create_graph([self.base_node], [])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert len(result.edges_removed) == 1
        
        removed_edge = result.edges_removed[0]
        assert removed_edge.edge_id == "edge_1"
        assert removed_edge.diff_type == DiffType.REMOVED
        assert "Removed connection from node_1:out1 to node_2:in1" in removed_edge.changes[0]
    
    def test_metadata_changes(self):
        """測試元數據變更檢測"""
        metadata_old = GraphMetadata(
            name="Old Graph",
            description="Old Description",
            version="1.0.0"
        )
        
        metadata_new = GraphMetadata(
            name="New Graph", 
            description="New Description",
            version="1.1.0"
        )
        
        graph1 = self.create_graph([], [], metadata_old)
        graph2 = self.create_graph([], [], metadata_new)
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert len(result.metadata_changes) == 3
        
        changes = result.metadata_changes
        assert any("Name: 'Old Graph' → 'New Graph'" in change for change in changes)
        assert any("Description: 'Old Description' → 'New Description'" in change for change in changes)
        assert any("Version: '1.0.0' → '1.1.0'" in change for change in changes)
    
    def test_complex_diff(self):
        """測試複雜的多重變更"""
        # 舊圖形：2個節點，1條邊
        node1_old = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Add", namespace="math"),
            position=Position(x=100, y=200)
        )
        node2_old = RamenNode(
            id="node_2", 
            metadata=NodeMetadata(type="operator", name="Sub", namespace="math"),
            position=Position(x=200, y=200)
        )
        edge_old = RamenEdge(
            id="edge_1",
            source_node_id="node_1",
            source_port_id="out1",
            target_node_id="node_2",
            target_port_id="in1"
        )
        
        # 新圖形：修改node1，刪除node2，新增node3，新邊
        node1_new = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Multiply", namespace="math"),  # 名稱修改
            position=Position(x=150, y=250)  # 位置移動
        )
        node3_new = RamenNode(
            id="node_3",
            metadata=NodeMetadata(type="operator", name="Divide", namespace="math"),
            position=Position(x=300, y=200)
        )
        edge_new = RamenEdge(
            id="edge_2",
            source_node_id="node_1", 
            source_port_id="out1",
            target_node_id="node_3",
            target_port_id="in1"
        )
        
        graph1 = self.create_graph([node1_old, node2_old], [edge_old])
        graph2 = self.create_graph([node1_new, node3_new], [edge_new])
        
        result = self.differ.compare(graph1, graph2)
        
        assert not result.is_empty
        assert result.total_changes == 5  # 1修改+1移動, 1刪除, 1新增, 1邊刪除, 1邊新增
        
        # 檢查各類變更
        assert len(result.nodes_modified) == 1  # node1 名稱和位置變更
        assert len(result.nodes_removed) == 1   # node2 刪除
        assert len(result.nodes_added) == 1     # node3 新增
        assert len(result.edges_removed) == 1   # edge_1 刪除
        assert len(result.edges_added) == 1     # edge_2 新增


class TestDiffFormatting:
    """測試差異格式化"""
    
    def test_empty_diff_formatting(self):
        """測試空差異格式化"""
        result = GraphDiffResult(from_version="v1", to_version="v2")
        summary = format_diff_summary(result)
        
        assert "No changes detected" in summary
    
    def test_complete_diff_formatting(self):
        """測試完整差異格式化"""
        result = GraphDiffResult(from_version="v1", to_version="v2")
        
        # 新增一些測試數據
        result.nodes_added.append(NodeDiff(
            node_id="new_node",
            diff_type=DiffType.ADDED,
            changes=["Added node 'Test' of type operator"]
        ))
        
        result.nodes_removed.append(NodeDiff(
            node_id="old_node",
            diff_type=DiffType.REMOVED,
            changes=["Removed node 'Old' of type operator"]
        ))
        
        result.metadata_changes.append("Name: 'Old' → 'New'")
        
        summary = format_diff_summary(result)
        
        assert "Graph diff from v1 to v2" in summary
        assert "Total changes: 3" in summary
        assert "Nodes added (1):" in summary
        assert "Nodes removed (1):" in summary
        assert "Metadata changes (1):" in summary
        assert "+ new_node: Added node 'Test'" in summary
        assert "- old_node: Removed node 'Old'" in summary
        assert "~ Name: 'Old' → 'New'" in summary


class TestDiffTypes:
    """測試差異類型枚舉"""
    
    def test_diff_type_values(self):
        """測試差異類型值"""
        assert DiffType.ADDED.value == "added"
        assert DiffType.REMOVED.value == "removed"
        assert DiffType.MODIFIED.value == "modified"
        assert DiffType.MOVED.value == "moved"
        assert DiffType.RECONNECTED.value == "reconnected"


if __name__ == "__main__":
    pytest.main([__file__])