"""
圖形合併和衝突解決系統
實現三方合併演算法和智能衝突檢測
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from enum import Enum
import json
from datetime import datetime

from ..core.models import RamenGraph, RamenNode, RamenEdge, GraphMetadata
from .diff import GraphDiffer, GraphDiffResult, DiffType


class ConflictType(Enum):
    """衝突類型"""
    NODE_BOTH_MODIFIED = "node_both_modified"       # 節點在兩邊都被修改
    NODE_DELETED_MODIFIED = "node_deleted_modified" # 一邊刪除，一邊修改
    EDGE_BOTH_MODIFIED = "edge_both_modified"       # 邊在兩邊都被修改
    EDGE_DELETED_MODIFIED = "edge_deleted_modified" # 邊一邊刪除，一邊修改
    METADATA_CONFLICT = "metadata_conflict"         # 元數據衝突
    STRUCTURAL_CONFLICT = "structural_conflict"     # 結構性衝突


class ConflictResolution(Enum):
    """衝突解決策略"""
    KEEP_LEFT = "keep_left"         # 保留左邊 (base → ours)
    KEEP_RIGHT = "keep_right"       # 保留右邊 (base → theirs)  
    KEEP_BOTH = "keep_both"         # 保留兩邊 (合併)
    MANUAL = "manual"               # 手動解決
    AUTO_MERGE = "auto_merge"       # 自動智能合併


@dataclass
class ConflictItem:
    """衝突項目"""
    conflict_id: str
    conflict_type: ConflictType
    element_id: str                 # 節點或邊的 ID
    element_type: str               # "node" 或 "edge" 或 "metadata"
    
    # 三方數據
    base_data: Optional[Dict[str, Any]] = None      # 共同祖先版本
    left_data: Optional[Dict[str, Any]] = None      # 左邊分支 (ours)
    right_data: Optional[Dict[str, Any]] = None     # 右邊分支 (theirs)
    
    # 衝突描述
    description: str = ""
    details: List[str] = field(default_factory=list)
    
    # 解決方案
    resolution: Optional[ConflictResolution] = None
    resolved_data: Optional[Dict[str, Any]] = None
    
    # 自動解決建議
    auto_resolution_suggestion: Optional[ConflictResolution] = None
    auto_resolution_confidence: float = 0.0  # 0.0 - 1.0


@dataclass
class MergeResult:
    """合併結果"""
    success: bool
    merged_graph: Optional[RamenGraph] = None
    
    # 衝突信息
    has_conflicts: bool = False
    conflicts: List[ConflictItem] = field(default_factory=list)
    
    # 合併統計
    auto_merged_count: int = 0      # 自動合併的項目數
    manual_required_count: int = 0   # 需要手動解決的衝突數
    
    # 合併摘要
    merge_summary: str = ""
    warnings: List[str] = field(default_factory=list)
    
    # 版本信息
    base_version: str = ""
    left_version: str = ""  
    right_version: str = ""
    merged_version: str = ""
    
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class GraphMerger:
    """圖形三方合併器"""
    
    def __init__(self):
        self.differ = GraphDiffer()
        
        # 自動合併策略配置
        self.auto_merge_config = {
            'allow_position_merge': True,       # 允許位置自動合併
            'allow_metadata_merge': True,       # 允許元數據自動合併
            'allow_additive_merge': True,       # 允許純新增內容合併
            'conflict_threshold': 0.7           # 自動解決信心閾值
        }
    
    def three_way_merge(self, 
                       base_graph: RamenGraph, 
                       left_graph: RamenGraph,   # ours
                       right_graph: RamenGraph,  # theirs
                       base_version: str = "base",
                       left_version: str = "ours", 
                       right_version: str = "theirs") -> MergeResult:
        """
        執行三方合併
        
        Args:
            base_graph: 共同祖先版本
            left_graph: 左邊分支版本 (通常是當前分支)
            right_graph: 右邊分支版本 (通常是要合併的分支)
            base_version, left_version, right_version: 版本標識
            
        Returns:
            MergeResult: 合併結果，包含衝突信息
        """
        result = MergeResult(
            success=False,
            base_version=base_version,
            left_version=left_version,
            right_version=right_version,
            merged_version=f"merge_{left_version}_{right_version}"
        )
        
        # 計算兩個分支相對於 base 的差異
        left_diff = self.differ.compare(base_graph, left_graph, base_version, left_version)
        right_diff = self.differ.compare(base_graph, right_graph, base_version, right_version)
        
        # 檢測衝突
        conflicts = self._detect_conflicts(base_graph, left_diff, right_diff)
        
        # 嘗試自動解決衝突
        auto_resolved_conflicts, remaining_conflicts = self._auto_resolve_conflicts(
            conflicts, base_graph, left_graph, right_graph
        )
        
        result.conflicts = remaining_conflicts
        result.has_conflicts = len(remaining_conflicts) > 0
        result.auto_merged_count = len(auto_resolved_conflicts)
        result.manual_required_count = len(remaining_conflicts)
        
        # 如果沒有衝突或所有衝突都已自動解決，生成合併結果
        if not result.has_conflicts:
            result.merged_graph = self._create_merged_graph(
                base_graph, left_diff, right_diff, auto_resolved_conflicts
            )
            result.success = True
        
        # 生成合併摘要
        result.merge_summary = self._generate_merge_summary(result, left_diff, right_diff)
        
        return result
    
    def _detect_conflicts(self, 
                         base_graph: RamenGraph,
                         left_diff: GraphDiffResult, 
                         right_diff: GraphDiffResult) -> List[ConflictItem]:
        """檢測合併衝突"""
        conflicts = []
        conflict_id_counter = 1
        
        # 建立節點和邊的映射
        base_nodes = {node.id: node for node in base_graph.nodes}
        base_edges = {edge.id: edge for edge in base_graph.edges}
        
        # 檢測節點衝突
        conflicts.extend(self._detect_node_conflicts(
            base_nodes, left_diff, right_diff, conflict_id_counter
        ))
        conflict_id_counter += len(conflicts)
        
        # 檢測邊衝突
        edge_conflicts = self._detect_edge_conflicts(
            base_edges, left_diff, right_diff, conflict_id_counter
        )
        conflicts.extend(edge_conflicts)
        conflict_id_counter += len(edge_conflicts)
        
        # 檢測元數據衝突
        metadata_conflicts = self._detect_metadata_conflicts(
            base_graph.metadata, left_diff, right_diff, conflict_id_counter
        )
        conflicts.extend(metadata_conflicts)
        
        return conflicts
    
    def _detect_node_conflicts(self,
                              base_nodes: Dict[str, RamenNode],
                              left_diff: GraphDiffResult,
                              right_diff: GraphDiffResult,
                              start_id: int) -> List[ConflictItem]:
        """檢測節點相關衝突"""
        conflicts = []
        conflict_id = start_id
        
        # 獲取所有修改和刪除的節點 ID
        left_modified = {diff.node_id for diff in left_diff.nodes_modified + left_diff.nodes_moved}
        left_removed = {diff.node_id for diff in left_diff.nodes_removed}
        
        right_modified = {diff.node_id for diff in right_diff.nodes_modified + right_diff.nodes_moved}  
        right_removed = {diff.node_id for diff in right_diff.nodes_removed}
        
        # 檢測雙邊修改衝突
        both_modified = left_modified & right_modified
        for node_id in both_modified:
            left_diff_item = self._find_node_diff(left_diff, node_id)
            right_diff_item = self._find_node_diff(right_diff, node_id)
            
            if left_diff_item and right_diff_item:
                conflict = ConflictItem(
                    conflict_id=f"conflict_{conflict_id}",
                    conflict_type=ConflictType.NODE_BOTH_MODIFIED,
                    element_id=node_id,
                    element_type="node",
                    base_data=self._node_to_dict(base_nodes[node_id]) if node_id in base_nodes else None,
                    left_data=left_diff_item.new_data,
                    right_data=right_diff_item.new_data,
                    description=f"Node '{node_id}' modified in both branches",
                    details=[
                        f"Left changes: {', '.join(left_diff_item.changes)}",
                        f"Right changes: {', '.join(right_diff_item.changes)}"
                    ]
                )
                
                # 嘗試自動解決建議
                suggestion, confidence = self._suggest_node_resolution(conflict)
                conflict.auto_resolution_suggestion = suggestion
                conflict.auto_resolution_confidence = confidence
                
                conflicts.append(conflict)
                conflict_id += 1
        
        # 檢測刪除-修改衝突
        deleted_modified_left = left_removed & right_modified
        deleted_modified_right = left_modified & right_removed
        
        for node_id in deleted_modified_left:
            right_diff_item = self._find_node_diff(right_diff, node_id)
            if right_diff_item:
                conflict = ConflictItem(
                    conflict_id=f"conflict_{conflict_id}",
                    conflict_type=ConflictType.NODE_DELETED_MODIFIED,
                    element_id=node_id,
                    element_type="node",
                    base_data=self._node_to_dict(base_nodes[node_id]) if node_id in base_nodes else None,
                    left_data=None,  # 左邊刪除
                    right_data=right_diff_item.new_data,
                    description=f"Node '{node_id}' deleted in left branch but modified in right branch",
                    details=[f"Right changes: {', '.join(right_diff_item.changes)}"]
                )
                conflicts.append(conflict)
                conflict_id += 1
        
        for node_id in deleted_modified_right:
            left_diff_item = self._find_node_diff(left_diff, node_id)
            if left_diff_item:
                conflict = ConflictItem(
                    conflict_id=f"conflict_{conflict_id}",
                    conflict_type=ConflictType.NODE_DELETED_MODIFIED,
                    element_id=node_id,
                    element_type="node",
                    base_data=self._node_to_dict(base_nodes[node_id]) if node_id in base_nodes else None,
                    left_data=left_diff_item.new_data,
                    right_data=None,  # 右邊刪除
                    description=f"Node '{node_id}' modified in left branch but deleted in right branch",
                    details=[f"Left changes: {', '.join(left_diff_item.changes)}"]
                )
                conflicts.append(conflict)
                conflict_id += 1
        
        return conflicts
    
    def _detect_edge_conflicts(self,
                              base_edges: Dict[str, RamenEdge],
                              left_diff: GraphDiffResult,
                              right_diff: GraphDiffResult,
                              start_id: int) -> List[ConflictItem]:
        """檢測邊相關衝突"""
        conflicts = []
        conflict_id = start_id
        
        # 類似節點衝突檢測邏輯
        left_modified = {diff.edge_id for diff in left_diff.edges_modified}
        left_removed = {diff.edge_id for diff in left_diff.edges_removed}
        
        right_modified = {diff.edge_id for diff in right_diff.edges_modified}
        right_removed = {diff.edge_id for diff in right_diff.edges_removed}
        
        # 雙邊修改衝突
        both_modified = left_modified & right_modified
        for edge_id in both_modified:
            left_diff_item = self._find_edge_diff(left_diff, edge_id)
            right_diff_item = self._find_edge_diff(right_diff, edge_id)
            
            if left_diff_item and right_diff_item:
                conflict = ConflictItem(
                    conflict_id=f"conflict_{conflict_id}",
                    conflict_type=ConflictType.EDGE_BOTH_MODIFIED,
                    element_id=edge_id,
                    element_type="edge",
                    base_data=self._edge_to_dict(base_edges[edge_id]) if edge_id in base_edges else None,
                    left_data=left_diff_item.new_data,
                    right_data=right_diff_item.new_data,
                    description=f"Edge '{edge_id}' modified in both branches",
                    details=[
                        f"Left changes: {', '.join(left_diff_item.changes)}",
                        f"Right changes: {', '.join(right_diff_item.changes)}"
                    ]
                )
                conflicts.append(conflict)
                conflict_id += 1
        
        return conflicts
    
    def _detect_metadata_conflicts(self,
                                  base_metadata: GraphMetadata,
                                  left_diff: GraphDiffResult,
                                  right_diff: GraphDiffResult,
                                  start_id: int) -> List[ConflictItem]:
        """檢測元數據衝突"""
        conflicts = []
        
        # 檢查是否兩邊都有元數據變更
        if left_diff.metadata_changes and right_diff.metadata_changes:
            conflict = ConflictItem(
                conflict_id=f"conflict_{start_id}",
                conflict_type=ConflictType.METADATA_CONFLICT,
                element_id="metadata",
                element_type="metadata",
                base_data={"name": base_metadata.name, "description": base_metadata.description, "version": base_metadata.version},
                left_data={"changes": left_diff.metadata_changes},
                right_data={"changes": right_diff.metadata_changes},
                description="Graph metadata modified in both branches",
                details=left_diff.metadata_changes + right_diff.metadata_changes
            )
            conflicts.append(conflict)
        
        return conflicts
    
    def _auto_resolve_conflicts(self,
                               conflicts: List[ConflictItem],
                               base_graph: RamenGraph,
                               left_graph: RamenGraph,
                               right_graph: RamenGraph) -> Tuple[List[ConflictItem], List[ConflictItem]]:
        """
        嘗試自動解決衝突
        
        Returns:
            Tuple[已解決的衝突列表, 仍需手動解決的衝突列表]
        """
        auto_resolved = []
        manual_required = []
        
        for conflict in conflicts:
            if (conflict.auto_resolution_confidence >= self.auto_merge_config['conflict_threshold'] and
                conflict.auto_resolution_suggestion is not None):
                
                # 應用自動解決策略
                conflict.resolution = conflict.auto_resolution_suggestion
                conflict.resolved_data = self._apply_resolution(conflict)
                auto_resolved.append(conflict)
            else:
                manual_required.append(conflict)
        
        return auto_resolved, manual_required
    
    def _suggest_node_resolution(self, conflict: ConflictItem) -> Tuple[Optional[ConflictResolution], float]:
        """為節點衝突建議解決方案"""
        if conflict.conflict_type != ConflictType.NODE_BOTH_MODIFIED:
            return None, 0.0
        
        left_data = conflict.left_data or {}
        right_data = conflict.right_data or {}
        base_data = conflict.base_data or {}
        
        # 如果只是位置變更，可以嘗試智能合併
        if (self._is_only_position_change(left_data, base_data) and
            self._is_only_position_change(right_data, base_data)):
            
            # 計算位置的平均值或選擇較新的位置
            return ConflictResolution.AUTO_MERGE, 0.8
        
        # 如果變更不重疊（例如一邊改名稱，一邊改配置）
        if self._changes_are_non_overlapping(left_data, right_data, base_data):
            return ConflictResolution.AUTO_MERGE, 0.9
        
        # 預設建議保留左邊（當前分支）
        return ConflictResolution.KEEP_LEFT, 0.3
    
    def _is_only_position_change(self, new_data: Dict, base_data: Dict) -> bool:
        """檢查是否只有位置變更"""
        if 'position' not in new_data or 'position' not in base_data:
            return False
        
        # 比較除位置外的其他屬性
        new_without_pos = {k: v for k, v in new_data.items() if k != 'position'}
        base_without_pos = {k: v for k, v in base_data.items() if k != 'position'}
        
        return new_without_pos == base_without_pos
    
    def _changes_are_non_overlapping(self, left_data: Dict, right_data: Dict, base_data: Dict) -> bool:
        """檢查兩邊的變更是否不重疊"""
        left_changes = set()
        right_changes = set()
        
        # 找出左邊變更的欄位
        for key, value in left_data.items():
            if key not in base_data or base_data[key] != value:
                left_changes.add(key)
        
        # 找出右邊變更的欄位
        for key, value in right_data.items():
            if key not in base_data or base_data[key] != value:
                right_changes.add(key)
        
        # 如果沒有重疊的變更欄位，則可以自動合併
        return len(left_changes & right_changes) == 0
    
    def _apply_resolution(self, conflict: ConflictItem) -> Dict[str, Any]:
        """應用衝突解決策略"""
        if conflict.resolution == ConflictResolution.KEEP_LEFT:
            return conflict.left_data or {}
        elif conflict.resolution == ConflictResolution.KEEP_RIGHT:
            return conflict.right_data or {}
        elif conflict.resolution == ConflictResolution.AUTO_MERGE:
            return self._intelligent_merge(conflict)
        else:
            return conflict.base_data or {}
    
    def _intelligent_merge(self, conflict: ConflictItem) -> Dict[str, Any]:
        """智能合併衝突數據"""
        base_data = conflict.base_data or {}
        left_data = conflict.left_data or {}
        right_data = conflict.right_data or {}
        
        merged = base_data.copy()
        
        # 合併非重疊變更
        for key, value in left_data.items():
            if key not in base_data or base_data[key] != value:
                merged[key] = value
        
        for key, value in right_data.items():
            if key not in base_data or base_data[key] != value:
                if key not in merged or merged[key] == base_data.get(key):
                    merged[key] = value
                elif key == 'position':
                    # 位置取平均值
                    if isinstance(merged[key], dict) and isinstance(value, dict):
                        if 'x' in merged[key] and 'x' in value:
                            merged[key]['x'] = (merged[key]['x'] + value['x']) / 2
                        if 'y' in merged[key] and 'y' in value:  
                            merged[key]['y'] = (merged[key]['y'] + value['y']) / 2
        
        return merged
    
    def _create_merged_graph(self,
                            base_graph: RamenGraph,
                            left_diff: GraphDiffResult,
                            right_diff: GraphDiffResult,
                            resolved_conflicts: List[ConflictItem]) -> RamenGraph:
        """建立合併後的圖形"""
        # 從 base 開始構建合併結果
        merged_nodes = {node.id: node for node in base_graph.nodes}
        merged_edges = {edge.id: edge for edge in base_graph.edges}
        merged_metadata = base_graph.metadata
        
        # 應用左邊的變更
        self._apply_diff_to_graph(merged_nodes, merged_edges, left_diff, "left")
        
        # 應用右邊的變更
        self._apply_diff_to_graph(merged_nodes, merged_edges, right_diff, "right")
        
        # 應用衝突解決結果
        for conflict in resolved_conflicts:
            self._apply_conflict_resolution(merged_nodes, merged_edges, conflict)
        
        # 建立新的圖形
        return RamenGraph(
            id=f"{base_graph.id}_merged",
            metadata=merged_metadata,
            nodes=list(merged_nodes.values()),
            edges=list(merged_edges.values()),
            variables=base_graph.variables  # 暫時保持變數不變
        )
    
    def _apply_diff_to_graph(self, nodes: Dict, edges: Dict, diff: GraphDiffResult, side: str):
        """將差異應用到圖形"""
        # 新增節點
        for node_diff in diff.nodes_added:
            if node_diff.new_data:
                # 這裡需要從 new_data 重建 RamenNode
                # 實際實現時需要完整的反序列化邏輯
                pass
        
        # 刪除節點
        for node_diff in diff.nodes_removed:
            if node_diff.node_id in nodes:
                del nodes[node_diff.node_id]
        
        # 修改節點
        for node_diff in diff.nodes_modified + diff.nodes_moved:
            if node_diff.node_id in nodes and node_diff.new_data:
                # 更新節點數據
                # 實際實現時需要完整的數據更新邏輯
                pass
        
        # 類似處理邊的變更
        for edge_diff in diff.edges_added:
            if edge_diff.new_data:
                pass
                
        for edge_diff in diff.edges_removed:
            if edge_diff.edge_id in edges:
                del edges[edge_diff.edge_id]
    
    def _apply_conflict_resolution(self, nodes: Dict, edges: Dict, conflict: ConflictItem):
        """應用衝突解決結果"""
        if conflict.element_type == "node" and conflict.resolved_data:
            # 更新節點數據
            # 實際實現時需要完整的數據更新邏輯
            pass
        elif conflict.element_type == "edge" and conflict.resolved_data:
            # 更新邊數據
            pass
    
    def _generate_merge_summary(self, result: MergeResult, left_diff: GraphDiffResult, right_diff: GraphDiffResult) -> str:
        """生成合併摘要"""
        lines = [
            f"Three-way merge: {result.base_version} + {result.left_version} + {result.right_version}",
            f"Auto-merged: {result.auto_merged_count} conflicts",
            f"Manual required: {result.manual_required_count} conflicts",
            f"Success: {'Yes' if result.success else 'No'}",
        ]
        
        if result.has_conflicts:
            lines.append("\nRemaining conflicts:")
            for conflict in result.conflicts:
                lines.append(f"  - {conflict.description}")
        
        return "\n".join(lines)
    
    # 輔助方法
    def _find_node_diff(self, diff_result: GraphDiffResult, node_id: str):
        """在差異結果中找到指定節點的變更"""
        for diff in diff_result.nodes_modified + diff_result.nodes_moved:
            if diff.node_id == node_id:
                return diff
        return None
    
    def _find_edge_diff(self, diff_result: GraphDiffResult, edge_id: str):
        """在差異結果中找到指定邊的變更"""
        for diff in diff_result.edges_modified:
            if diff.edge_id == edge_id:
                return diff
        return None
    
    def _node_to_dict(self, node: RamenNode) -> Dict[str, Any]:
        """將節點轉換為字典（復用 differ 的方法）"""
        return self.differ._node_to_dict(node)
    
    def _edge_to_dict(self, edge: RamenEdge) -> Dict[str, Any]:
        """將邊轉換為字典（復用 differ 的方法）"""
        return self.differ._edge_to_dict(edge)