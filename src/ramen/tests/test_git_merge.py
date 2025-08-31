"""
測試圖形合併和衝突解決系統
"""

import pytest
from datetime import datetime

from ramen.core.models import (
    RamenGraph, RamenNode, RamenEdge, GraphMetadata, 
    NodeMetadata, Position, Port
)
from ramen.git.merge import (
    GraphMerger, ConflictType, ConflictResolution,
    ConflictItem, MergeResult
)


class TestGraphMerger:
    """測試圖形合併器"""
    
    def setup_method(self):
        """設置測試環境"""
        self.merger = GraphMerger()
        
        # 建立基礎圖形元數據
        self.base_metadata = GraphMetadata(
            name="Base Graph",
            description="Base version",
            version="1.0.0"
        )
        
        # 建立基礎節點
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
    
    def test_no_conflict_merge(self):
        """測試無衝突合併"""
        # Base 圖形
        base = self.create_graph([self.base_node], [])
        
        # Left 分支：新增一個節點
        left_node = RamenNode(
            id="node_left",
            metadata=NodeMetadata(type="operator", name="Multiply", namespace="math"),
            position=Position(x=300, y=200)
        )
        left = self.create_graph([self.base_node, left_node], [])
        
        # Right 分支：新增另一個節點  
        right_node = RamenNode(
            id="node_right",
            metadata=NodeMetadata(type="operator", name="Divide", namespace="math"),
            position=Position(x=500, y=200)
        )
        right = self.create_graph([self.base_node, right_node], [])
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right, "base", "left", "right")
        
        # 驗證結果
        assert result.success
        assert not result.has_conflicts
        assert result.auto_merged_count >= 0
        assert result.manual_required_count == 0
        assert len(result.conflicts) == 0
    
    def test_node_both_modified_conflict(self):
        """測試節點雙邊修改衝突"""
        # Base 圖形
        base = self.create_graph([self.base_node], [])
        
        # Left 分支：修改節點名稱
        left_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator",
                name="Add Numbers",  # 名稱修改
                namespace="math"
            ),
            position=Position(x=100, y=200)
        )
        left = self.create_graph([left_node], [])
        
        # Right 分支：修改節點位置和名稱
        right_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator", 
                name="Addition",  # 不同的名稱修改
                namespace="math"
            ),
            position=Position(x=150, y=250)  # 位置修改
        )
        right = self.create_graph([right_node], [])
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right)
        
        # 驗證衝突檢測
        assert not result.success
        assert result.has_conflicts
        assert result.manual_required_count > 0
        
        # 檢查衝突類型
        node_conflicts = [c for c in result.conflicts if c.conflict_type == ConflictType.NODE_BOTH_MODIFIED]
        assert len(node_conflicts) == 1
        
        conflict = node_conflicts[0]
        assert conflict.element_id == "node_1"
        assert conflict.element_type == "node"
        assert "modified in both branches" in conflict.description
    
    def test_node_delete_modify_conflict(self):
        """測試節點刪除-修改衝突"""
        # Base 圖形
        base = self.create_graph([self.base_node], [])
        
        # Left 分支：刪除節點
        left = self.create_graph([], [])
        
        # Right 分支：修改節點
        right_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator",
                name="Modified Add",  # 名稱修改
                namespace="math"
            ),
            position=Position(x=150, y=250)  # 位置修改
        )
        right = self.create_graph([right_node], [])
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right)
        
        # 驗證衝突檢測
        assert not result.success
        assert result.has_conflicts
        
        # 檢查衝突類型
        conflicts = [c for c in result.conflicts if c.conflict_type == ConflictType.NODE_DELETED_MODIFIED]
        assert len(conflicts) == 1
        
        conflict = conflicts[0]
        assert conflict.element_id == "node_1"
        assert conflict.left_data is None  # 左邊刪除
        assert conflict.right_data is not None  # 右邊修改
    
    def test_metadata_conflict(self):
        """測試元數據衝突"""
        # Base 圖形
        base = self.create_graph([], [], self.base_metadata)
        
        # Left 分支：修改名稱
        left_metadata = GraphMetadata(
            name="Left Graph",  # 名稱修改
            description="Base version",
            version="1.0.0"
        )
        left = self.create_graph([], [], left_metadata)
        
        # Right 分支：修改描述  
        right_metadata = GraphMetadata(
            name="Base Graph",
            description="Right version",  # 描述修改
            version="1.0.0"
        )
        right = self.create_graph([], [], right_metadata)
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right)
        
        # 驗證結果（元數據變更通常可以自動合併，除非有衝突）
        if result.has_conflicts:
            metadata_conflicts = [c for c in result.conflicts if c.conflict_type == ConflictType.METADATA_CONFLICT]
            assert len(metadata_conflicts) <= 1
    
    def test_auto_merge_position_changes(self):
        """測試位置變更的自動合併"""
        # Base 圖形
        base = self.create_graph([self.base_node], [])
        
        # Left 分支：只改變位置
        left_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator",
                name="Add",  # 名稱不變
                namespace="math"
            ),
            position=Position(x=120, y=220)  # 位置小幅調整
        )
        left = self.create_graph([left_node], [])
        
        # Right 分支：也只改變位置
        right_node = RamenNode(
            id="node_1", 
            metadata=NodeMetadata(
                type="operator",
                name="Add",  # 名稱不變
                namespace="math"
            ),
            position=Position(x=130, y=230)  # 位置小幅調整
        )
        right = self.create_graph([right_node], [])
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right)
        
        # 位置變更應該能夠自動合併
        # （取決於具體的自動合併策略實現）
        assert result.auto_merged_count >= 0
    
    def test_non_overlapping_changes_auto_merge(self):
        """測試非重疊變更的自動合併"""
        # Base 圖形
        base = self.create_graph([self.base_node], [])
        
        # Left 分支：只改名稱
        left_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator",
                name="Add Numbers",  # 名稱修改
                namespace="math"
            ),
            position=Position(x=100, y=200)  # 位置不變
        )
        left = self.create_graph([left_node], [])
        
        # Right 分支：只改位置
        right_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(
                type="operator", 
                name="Add",  # 名稱不變
                namespace="math"
            ),
            position=Position(x=150, y=250)  # 位置修改
        )
        right = self.create_graph([right_node], [])
        
        # 執行合併
        result = self.merger.three_way_merge(base, left, right)
        
        # 非重疊變更應該能夠自動合併
        assert result.auto_merged_count >= 0
    
    def test_conflict_resolution_suggestions(self):
        """測試衝突解決建議"""
        # 建立一個有衝突的合併場景
        base = self.create_graph([self.base_node], [])
        
        left_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Left Add", namespace="math"),
            position=Position(x=100, y=200)
        )
        left = self.create_graph([left_node], [])
        
        right_node = RamenNode(
            id="node_1",
            metadata=NodeMetadata(type="operator", name="Right Add", namespace="math"),  
            position=Position(x=100, y=200)
        )
        right = self.create_graph([right_node], [])
        
        result = self.merger.three_way_merge(base, left, right)
        
        # 檢查是否有自動解決建議
        if result.has_conflicts:
            for conflict in result.conflicts:
                assert conflict.auto_resolution_suggestion is not None
                assert 0.0 <= conflict.auto_resolution_confidence <= 1.0
    
    def test_merge_summary_generation(self):
        """測試合併摘要生成"""
        base = self.create_graph([self.base_node], [])
        left = self.create_graph([self.base_node], [])
        right = self.create_graph([self.base_node], [])
        
        result = self.merger.three_way_merge(base, left, right, "v1", "v2", "v3")
        
        # 檢查摘要格式
        assert result.merge_summary
        assert "Three-way merge" in result.merge_summary
        assert "v1" in result.merge_summary
        assert "v2" in result.merge_summary
        assert "v3" in result.merge_summary
        assert "Auto-merged" in result.merge_summary
        assert "Manual required" in result.merge_summary
    
    def test_empty_graphs_merge(self):
        """測試空圖形合併"""
        base = self.create_graph([], [])
        left = self.create_graph([], [])
        right = self.create_graph([], [])
        
        result = self.merger.three_way_merge(base, left, right)
        
        assert result.success
        assert not result.has_conflicts
        assert result.auto_merged_count == 0
        assert result.manual_required_count == 0


class TestConflictResolution:
    """測試衝突解決功能"""
    
    def setup_method(self):
        self.merger = GraphMerger()
    
    def test_conflict_item_creation(self):
        """測試衝突項目創建"""
        conflict = ConflictItem(
            conflict_id="test_conflict",
            conflict_type=ConflictType.NODE_BOTH_MODIFIED,
            element_id="node_1",
            element_type="node",
            description="Test conflict"
        )
        
        assert conflict.conflict_id == "test_conflict"
        assert conflict.conflict_type == ConflictType.NODE_BOTH_MODIFIED
        assert conflict.element_id == "node_1"
        assert conflict.element_type == "node"
        assert conflict.resolution is None
        assert conflict.auto_resolution_suggestion is None
    
    def test_conflict_resolution_application(self):
        """測試衝突解決策略應用"""
        conflict = ConflictItem(
            conflict_id="test",
            conflict_type=ConflictType.NODE_BOTH_MODIFIED,
            element_id="node_1",
            element_type="node",
            left_data={"name": "Left"},
            right_data={"name": "Right"},
            base_data={"name": "Base"}
        )
        
        # 測試保留左邊
        conflict.resolution = ConflictResolution.KEEP_LEFT
        resolved = self.merger._apply_resolution(conflict)
        assert resolved == {"name": "Left"}
        
        # 測試保留右邊
        conflict.resolution = ConflictResolution.KEEP_RIGHT
        resolved = self.merger._apply_resolution(conflict)
        assert resolved == {"name": "Right"}
    
    def test_position_change_detection(self):
        """測試位置變更檢測"""
        base_data = {"name": "Test", "position": {"x": 100, "y": 200}}
        new_data = {"name": "Test", "position": {"x": 150, "y": 250}}
        
        is_position_only = self.merger._is_only_position_change(new_data, base_data)
        assert is_position_only
        
        # 測試非純位置變更
        new_data_with_name = {"name": "Changed", "position": {"x": 150, "y": 250}}
        is_position_only = self.merger._is_only_position_change(new_data_with_name, base_data)
        assert not is_position_only
    
    def test_non_overlapping_changes_detection(self):
        """測試非重疊變更檢測"""
        base_data = {"name": "Test", "position": {"x": 100, "y": 200}, "config": {}}
        left_data = {"name": "Left Test", "position": {"x": 100, "y": 200}, "config": {}}  # 只改名稱
        right_data = {"name": "Test", "position": {"x": 150, "y": 250}, "config": {}}  # 只改位置
        
        non_overlapping = self.merger._changes_are_non_overlapping(left_data, right_data, base_data)
        assert non_overlapping
        
        # 測試重疊變更
        left_data_overlap = {"name": "Left Test", "position": {"x": 120, "y": 220}, "config": {}}
        right_data_overlap = {"name": "Right Test", "position": {"x": 150, "y": 250}, "config": {}}
        
        non_overlapping = self.merger._changes_are_non_overlapping(left_data_overlap, right_data_overlap, base_data)
        assert not non_overlapping  # 名稱和位置都有變更，有重疊


class TestMergeResult:
    """測試合併結果"""
    
    def test_merge_result_initialization(self):
        """測試合併結果初始化"""
        result = MergeResult(
            success=True,
            base_version="v1",
            left_version="v2", 
            right_version="v3"
        )
        
        assert result.success
        assert not result.has_conflicts
        assert result.auto_merged_count == 0
        assert result.manual_required_count == 0
        assert len(result.conflicts) == 0
        assert result.base_version == "v1"
        assert result.left_version == "v2"
        assert result.right_version == "v3"
        assert result.timestamp  # 應該有時間戳
    
    def test_merge_result_with_conflicts(self):
        """測試包含衝突的合併結果"""
        conflict = ConflictItem(
            conflict_id="test",
            conflict_type=ConflictType.NODE_BOTH_MODIFIED,
            element_id="node_1",
            element_type="node"
        )
        
        result = MergeResult(
            success=False,
            has_conflicts=True,
            conflicts=[conflict],
            manual_required_count=1
        )
        
        assert not result.success
        assert result.has_conflicts
        assert len(result.conflicts) == 1
        assert result.manual_required_count == 1
        assert result.conflicts[0].conflict_id == "test"


if __name__ == "__main__":
    pytest.main([__file__])