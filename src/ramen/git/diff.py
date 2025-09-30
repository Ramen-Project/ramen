"""
圖形語義化差異比較系統
提供節點層級的變更檢測和視覺化格式
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set, Tuple
from enum import Enum
import json
from datetime import datetime

from ramen.core.models import RamenGraph, RamenNode, RamenEdge, GraphMetadata


class DiffType(Enum):
    """差異類型"""
    ADDED = "added"           # 新增
    REMOVED = "removed"       # 刪除  
    MODIFIED = "modified"     # 修改
    MOVED = "moved"           # 移動位置
    RECONNECTED = "reconnected"  # 重新連接


@dataclass
class NodeDiff:
    """節點差異"""
    node_id: str
    diff_type: DiffType
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    changes: List[str] = field(default_factory=list)  # 具體變更描述


@dataclass
class EdgeDiff:
    """邊差異"""
    edge_id: str
    diff_type: DiffType
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    changes: List[str] = field(default_factory=list)


@dataclass
class GraphDiffResult:
    """圖形差異結果"""
    from_version: str
    to_version: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # 差異統計
    nodes_added: List[NodeDiff] = field(default_factory=list)
    nodes_removed: List[NodeDiff] = field(default_factory=list) 
    nodes_modified: List[NodeDiff] = field(default_factory=list)
    nodes_moved: List[NodeDiff] = field(default_factory=list)
    
    edges_added: List[EdgeDiff] = field(default_factory=list)
    edges_removed: List[EdgeDiff] = field(default_factory=list)
    edges_modified: List[EdgeDiff] = field(default_factory=list)
    
    metadata_changes: List[str] = field(default_factory=list)
    
    # 摘要
    @property
    def total_changes(self) -> int:
        """總變更數量"""
        return (len(self.nodes_added) + len(self.nodes_removed) + 
                len(self.nodes_modified) + len(self.nodes_moved) +
                len(self.edges_added) + len(self.edges_removed) + 
                len(self.edges_modified) + len(self.metadata_changes))
    
    @property
    def is_empty(self) -> bool:
        """是否無變更"""
        return self.total_changes == 0


class GraphDiffer:
    """圖形差異比較器"""
    
    def __init__(self):
        self.ignore_fields = {
            'position',  # 忽略節點位置變更（除非是語義性移動）
            'selected',  # 忽略選中狀態
            'visible'    # 忽略可見性狀態
        }
    
    def compare(self, old_graph: RamenGraph, new_graph: RamenGraph, 
                from_version: str = "old", to_version: str = "new") -> GraphDiffResult:
        """
        比較兩個圖形，返回語義化差異
        
        Args:
            old_graph: 舊版本圖形
            new_graph: 新版本圖形
            from_version: 源版本標識
            to_version: 目標版本標識
            
        Returns:
            GraphDiffResult: 差異結果
        """
        result = GraphDiffResult(from_version=from_version, to_version=to_version)
        
        # 比較節點
        self._compare_nodes(old_graph.nodes, new_graph.nodes, result)
        
        # 比較邊
        self._compare_edges(old_graph.edges, new_graph.edges, result)
        
        # 比較元數據
        self._compare_metadata(old_graph.metadata, new_graph.metadata, result)
        
        return result
    
    def _compare_nodes(self, old_nodes: List[RamenNode], new_nodes: List[RamenNode], 
                      result: GraphDiffResult) -> None:
        """比較節點差異"""
        old_node_map = {node.id: node for node in old_nodes}
        new_node_map = {node.id: node for node in new_nodes}
        
        old_ids = set(old_node_map.keys())
        new_ids = set(new_node_map.keys())
        
        # 新增的節點
        for node_id in new_ids - old_ids:
            node = new_node_map[node_id]
            result.nodes_added.append(NodeDiff(
                node_id=node_id,
                diff_type=DiffType.ADDED,
                new_data=self._node_to_dict(node),
                changes=[f"Added node '{node.metadata.name}' of type {node.metadata.type}"]
            ))
        
        # 刪除的節點
        for node_id in old_ids - new_ids:
            node = old_node_map[node_id]
            result.nodes_removed.append(NodeDiff(
                node_id=node_id,
                diff_type=DiffType.REMOVED,
                old_data=self._node_to_dict(node),
                changes=[f"Removed node '{node.metadata.name}' of type {node.metadata.type}"]
            ))
        
        # 修改的節點
        for node_id in old_ids & new_ids:
            old_node = old_node_map[node_id]
            new_node = new_node_map[node_id]
            
            changes = self._compare_node_details(old_node, new_node)
            if changes:
                # 檢查是否只是位置移動
                non_position_changes = [c for c in changes if not c.startswith("Position")]
                if not non_position_changes and any(c.startswith("Position") for c in changes):
                    # 只有位置變更
                    result.nodes_moved.append(NodeDiff(
                        node_id=node_id,
                        diff_type=DiffType.MOVED,
                        old_data=self._node_to_dict(old_node),
                        new_data=self._node_to_dict(new_node),
                        changes=changes
                    ))
                else:
                    # 有其他修改
                    result.nodes_modified.append(NodeDiff(
                        node_id=node_id,
                        diff_type=DiffType.MODIFIED,
                        old_data=self._node_to_dict(old_node),
                        new_data=self._node_to_dict(new_node),
                        changes=changes
                    ))
    
    def _compare_edges(self, old_edges: List[RamenEdge], new_edges: List[RamenEdge],
                      result: GraphDiffResult) -> None:
        """比較邊差異"""
        old_edge_map = {edge.id: edge for edge in old_edges}
        new_edge_map = {edge.id: edge for edge in new_edges}
        
        old_ids = set(old_edge_map.keys())
        new_ids = set(new_edge_map.keys())
        
        # 新增的邊
        for edge_id in new_ids - old_ids:
            edge = new_edge_map[edge_id]
            result.edges_added.append(EdgeDiff(
                edge_id=edge_id,
                diff_type=DiffType.ADDED,
                new_data=self._edge_to_dict(edge),
                changes=[f"Added connection from {edge.source_node_id}:{edge.source_port_id} to {edge.target_node_id}:{edge.target_port_id}"]
            ))
        
        # 刪除的邊
        for edge_id in old_ids - new_ids:
            edge = old_edge_map[edge_id]
            result.edges_removed.append(EdgeDiff(
                edge_id=edge_id,
                diff_type=DiffType.REMOVED,
                old_data=self._edge_to_dict(edge),
                changes=[f"Removed connection from {edge.source_node_id}:{edge.source_port_id} to {edge.target_node_id}:{edge.target_port_id}"]
            ))
        
        # 修改的邊
        for edge_id in old_ids & new_ids:
            old_edge = old_edge_map[edge_id]
            new_edge = new_edge_map[edge_id]
            
            changes = self._compare_edge_details(old_edge, new_edge)
            if changes:
                result.edges_modified.append(EdgeDiff(
                    edge_id=edge_id,
                    diff_type=DiffType.MODIFIED,
                    old_data=self._edge_to_dict(old_edge),
                    new_data=self._edge_to_dict(new_edge),
                    changes=changes
                ))
    
    def _compare_metadata(self, old_metadata: GraphMetadata, new_metadata: GraphMetadata,
                         result: GraphDiffResult) -> None:
        """比較元數據差異"""
        if old_metadata.name != new_metadata.name:
            result.metadata_changes.append(f"Name: '{old_metadata.name}' → '{new_metadata.name}'")
        
        if old_metadata.description != new_metadata.description:
            result.metadata_changes.append(f"Description: '{old_metadata.description}' → '{new_metadata.description}'")
        
        if old_metadata.version != new_metadata.version:
            result.metadata_changes.append(f"Version: '{old_metadata.version}' → '{new_metadata.version}'")
    
    def _compare_node_details(self, old_node: RamenNode, new_node: RamenNode) -> List[str]:
        """比較節點詳細差異"""
        changes = []
        
        # 比較元數據
        if old_node.metadata.name != new_node.metadata.name:
            changes.append(f"Name: '{old_node.metadata.name}' → '{new_node.metadata.name}'")
        
        if old_node.metadata.description != new_node.metadata.description:
            changes.append(f"Description: '{old_node.metadata.description}' → '{new_node.metadata.description}'")
        
        # 比較位置
        if old_node.position.x != new_node.position.x or old_node.position.y != new_node.position.y:
            changes.append(f"Position: ({old_node.position.x}, {old_node.position.y}) → ({new_node.position.x}, {new_node.position.y})")
        
        # 比較配置
        if old_node.config != new_node.config:
            changes.append("Configuration changed")
        
        # 比較埠
        if len(old_node.inputs) != len(new_node.inputs):
            changes.append(f"Input ports: {len(old_node.inputs)} → {len(new_node.inputs)}")
        
        if len(old_node.outputs) != len(new_node.outputs):
            changes.append(f"Output ports: {len(old_node.outputs)} → {len(new_node.outputs)}")
        
        return changes
    
    def _compare_edge_details(self, old_edge: RamenEdge, new_edge: RamenEdge) -> List[str]:
        """比較邊詳細差異"""
        changes = []
        
        # 檢查連接變更
        if (old_edge.source_node_id != new_edge.source_node_id or 
            old_edge.source_port_id != new_edge.source_port_id):
            changes.append(f"Source: {old_edge.source_node_id}:{old_edge.source_port_id} → {new_edge.source_node_id}:{new_edge.source_port_id}")
        
        if (old_edge.target_node_id != new_edge.target_node_id or 
            old_edge.target_port_id != new_edge.target_port_id):
            changes.append(f"Target: {old_edge.target_node_id}:{old_edge.target_port_id} → {new_edge.target_node_id}:{new_edge.target_port_id}")
        
        # 比較標籤
        if old_edge.label != new_edge.label:
            changes.append(f"Label: '{old_edge.label}' → '{new_edge.label}'")
        
        return changes
    
    def _node_to_dict(self, node: RamenNode) -> Dict[str, Any]:
        """將節點轉換為字典格式"""
        return {
            'id': node.id,
            'type': node.metadata.type,
            'name': node.metadata.name,
            'namespace': node.metadata.namespace,
            'position': {'x': node.position.x, 'y': node.position.y},
            'inputs': len(node.inputs),
            'outputs': len(node.outputs),
            'config': node.config
        }
    
    def _edge_to_dict(self, edge: RamenEdge) -> Dict[str, Any]:
        """將邊轉換為字典格式"""
        return {
            'id': edge.id,
            'source': f"{edge.source_node_id}:{edge.source_port_id}",
            'target': f"{edge.target_node_id}:{edge.target_port_id}",
            'label': edge.label
        }


def format_diff_summary(diff_result: GraphDiffResult) -> str:
    """格式化差異摘要為可讀文本"""
    if diff_result.is_empty:
        return "No changes detected"
    
    lines = [
        f"Graph diff from {diff_result.from_version} to {diff_result.to_version}",
        f"Total changes: {diff_result.total_changes}",
        ""
    ]
    
    # 節點變更
    if diff_result.nodes_added:
        lines.append(f"Nodes added ({len(diff_result.nodes_added)}):")
        for node_diff in diff_result.nodes_added:
            lines.append(f"  + {node_diff.node_id}: {', '.join(node_diff.changes)}")
        lines.append("")
    
    if diff_result.nodes_removed:
        lines.append(f"Nodes removed ({len(diff_result.nodes_removed)}):")
        for node_diff in diff_result.nodes_removed:
            lines.append(f"  - {node_diff.node_id}: {', '.join(node_diff.changes)}")
        lines.append("")
    
    if diff_result.nodes_modified:
        lines.append(f"Nodes modified ({len(diff_result.nodes_modified)}):")
        for node_diff in diff_result.nodes_modified:
            lines.append(f"  ~ {node_diff.node_id}: {', '.join(node_diff.changes)}")
        lines.append("")
    
    if diff_result.nodes_moved:
        lines.append(f"Nodes moved ({len(diff_result.nodes_moved)}):")
        for node_diff in diff_result.nodes_moved:
            lines.append(f"  → {node_diff.node_id}: {', '.join(node_diff.changes)}")
        lines.append("")
    
    # 邊變更
    if diff_result.edges_added:
        lines.append(f"Edges added ({len(diff_result.edges_added)}):")
        for edge_diff in diff_result.edges_added:
            lines.append(f"  + {edge_diff.edge_id}: {', '.join(edge_diff.changes)}")
        lines.append("")
    
    if diff_result.edges_removed:
        lines.append(f"Edges removed ({len(diff_result.edges_removed)}):")
        for edge_diff in diff_result.edges_removed:
            lines.append(f"  - {edge_diff.edge_id}: {', '.join(edge_diff.changes)}")
        lines.append("")
    
    if diff_result.edges_modified:
        lines.append(f"Edges modified ({len(diff_result.edges_modified)}):")
        for edge_diff in diff_result.edges_modified:
            lines.append(f"  ~ {edge_diff.edge_id}: {', '.join(edge_diff.changes)}")
        lines.append("")
    
    # 元數據變更
    if diff_result.metadata_changes:
        lines.append(f"Metadata changes ({len(diff_result.metadata_changes)}):")
        for change in diff_result.metadata_changes:
            lines.append(f"  ~ {change}")
    
    return "\n".join(lines)